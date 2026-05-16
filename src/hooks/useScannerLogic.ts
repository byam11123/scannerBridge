import { useState, useEffect, useRef, useCallback } from 'react';
import { Scanner, Status, ConfirmData, AlertData, EmailData, PDFSettings } from '../types/scanner';

export function useScannerLogic() {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<Scanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'pulse', text: 'Connecting...' });
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [deviceViewMode, setDeviceViewMode] = useState<'default' | 'compact'>('default');
  
  // Settings
  const [paperSource, setPaperSource] = useState('Flatbed');
  const [pageSize] = useState('A4');
  const [dpi, setDpi] = useState('300');
  const [colorMode, setColorMode] = useState('Color');
  const [fileFormat, setFileFormat] = useState('pdf');
  
  // Result & UI State
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [zoomLevel, setZoomLevel] = useState(3);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [deskewEnabled, setDeskewEnabled] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailData, setEmailData] = useState<EmailData>({ to: '', subject: 'Scanned Document', body: 'Please find the attached scanned document.' });
  const [processing, setProcessing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Dropdown & Settings States
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [pdfSettingsModal, setPdfSettingsModal] = useState(false);
  const [imageSettingsModal, setImageSettingsModal] = useState(false);
  
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    title: 'Scanned Document',
    author: 'NAPS2 Bridge',
    subject: 'Scanned Document',
    keywords: ''
  });
  const [imageQuality, setImageQuality] = useState(75);

  // Custom Dialog States
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);

  const saveMenuRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const startScanRef = useRef<(() => Promise<void>) | null>(null);

  const zoomIn = useCallback(() => setZoomLevel(prev => Math.max(1, prev - 1)), []);
  const zoomOut = useCallback(() => setZoomLevel(prev => Math.min(8, prev + 1)), []);

  const showAlert = useCallback((title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertData({ open: true, title, message, type });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger', confirmText?: string, cancelText?: string) => {
    setConfirmData({ open: true, title, message, onConfirm, type, confirmText, cancelText });
  }, []);

  // Local Agent Setup State
  const [isMounted, setIsMounted] = useState(false);
  const [isVercel, setIsVercel] = useState(false);
  const [agentInstalled, setAgentInstalled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [isInstalling, setIsInstalling] = useState(false);
  const [theme, setTheme] = useState('dark');

  // --- Helper Functions ---
  const loadDevices = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setRefreshProgress(0);

    const interval = setInterval(() => {
      setRefreshProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 50);

    try {
      const res = await fetch('/api/scanners');
      const data = await res.json();
      const rawScanners = data.scanners || [];
      const driverPriority: Record<string, number> = { 'escl': 3, 'wia': 2, 'twain': 1 };
      const savedScannerName = localStorage.getItem('scanner-bridge-selected-name');
      const uniqueScanners = rawScanners.reduce((acc: Scanner[], current: Scanner) => {
        const existingIndex = acc.findIndex(s => s.name === current.name);
        if (existingIndex > -1) {
          const existing = acc[existingIndex];
          if (driverPriority[current.driver?.toLowerCase()] > driverPriority[existing.driver?.toLowerCase()]) {
            acc[existingIndex] = current;
          }
        } else {
          acc.push(current);
        }
        return acc;
      }, []);

      setScanners(uniqueScanners);
      if (uniqueScanners.length > 0) {
        const saved = uniqueScanners.find((s: Scanner) => s.name === savedScannerName);
        if (saved) setSelectedScanner(saved);
        else {
          setSelectedScanner(current => current || uniqueScanners[0]);
        }
      }
      setRefreshProgress(100);
      setTimeout(() => setRefreshProgress(0), 400);
    } catch (err) {
      console.error('Failed to load devices', err);
      setRefreshProgress(0);
    } finally {
      clearInterval(interval);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') setStatus({ type: 'green', text: 'Bridge Online' });
      else setStatus({ type: 'red', text: 'NAPS2 Missing' });
    } catch {
      setStatus({ type: 'red', text: 'Server Offline' });
    }
  }, []);

  const loadExistingFiles = useCallback(async () => {
    try {
      const savedSession = localStorage.getItem('scanner-bridge-session-files');
      if (savedSession) {
        const sessionFiles = JSON.parse(savedSession);
        if (sessionFiles && Array.isArray(sessionFiles)) {
          const res = await fetch('/api/files');
          const data = await res.json();
          if (data.files) {
            const validFiles = sessionFiles.filter(f => data.files.includes(f));
            setPages(validFiles);
          }
          setInitialLoadDone(true);
          return;
        }
      }
      setInitialLoadDone(true);
    } catch (err) {
      console.error('Failed to load session files:', err);
      setInitialLoadDone(true);
    }
  }, []);

  const deleteSelectedPages = useCallback(async () => {
    if (selectedPages.size === 0) return;
    const filenames = Array.from(selectedPages).map(i => pages[i]);
    try {
      await fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames })
      });
      setPages(prev => prev.filter((_, i) => !selectedPages.has(i)));
      setSelectedPages(new Set());
      setPageRotations(prev => {
        const next: Record<number, number> = {};
        let nextIdx = 0;
        pages.forEach((_, i) => {
          if (!selectedPages.has(i)) {
            if (prev[i] !== undefined) next[nextIdx] = prev[i];
            nextIdx++;
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to delete pages', err);
      showAlert('Deletion Failed', 'Some files could not be deleted.');
    }
  }, [pages, selectedPages, showAlert]);



  useEffect(() => {
    const init = async () => {
      await loadDevices();
      await checkStatus();
      await loadExistingFiles();
    };
    init();
    
    const clickOut = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', clickOut);

    return () => {
      document.removeEventListener('mousedown', clickOut);
    };
  }, [loadDevices, checkStatus, loadExistingFiles]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        // Only select if not in an input/textarea
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
        
        e.preventDefault();
        setSelectedPages(new Set(Array.from({ length: pages.length }, (_, i) => i)));
      }
      
      if (e.key === 'Delete' && selectedPages.size > 0) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
        e.preventDefault();
        showConfirm('Delete Selected', `Are you sure you want to delete ${selectedPages.size} selected pages?`, () => {
          deleteSelectedPages();
          setConfirmData(null);
        }, 'danger', `Delete ${selectedPages.size} ${selectedPages.size === 1 ? 'Page' : 'Pages'}`, 'Cancel');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pages, selectedPages, deleteSelectedPages, showConfirm]);

  // Separate Wheel Zoom Effect to ensure Ref availability
  useEffect(() => {
    if (!isMounted) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    };

    const box = previewBoxRef.current;
    if (box) {
      box.addEventListener('wheel', onWheel as EventListener, { passive: false });
      return () => {
        box.removeEventListener('wheel', onWheel as EventListener);
      };
    }
  }, [isMounted, zoomIn, zoomOut]);

  const rotateSelected = useCallback(() => {
    if (selectedPages.size === 0) return;
    const newRotations = { ...pageRotations };
    selectedPages.forEach(index => {
      newRotations[index] = (newRotations[index] || 0) + 90;
    });
    setPageRotations(newRotations);
  }, [selectedPages, pageRotations]);

  const rotatePage = useCallback((index: number, direction: 'left' | 'right') => {
    setPageRotations(prev => {
      const current = prev[index] || 0;
      const amount = direction === 'left' ? -90 : 90;
      return { ...prev, [index]: current + amount };
    });
  }, []);

  const handleInstallAgent = useCallback(async () => {
    setIsInstalling(true);
    setSetupStep(1);
    
    try {
      const res = await fetch('/api/install', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Installation failed');
      }

      setSetupStep(2);
      await new Promise(r => setTimeout(r, 1000));
      setSetupStep(3);
      
      // Final check
      const statusRes = await fetch('/api/status');
      const statusData = await statusRes.json();
      
      if (statusData.status === 'online') {
        setIsInstalling(false);
        setAgentInstalled(true);
        setSetupOpen(false);
        showAlert('Agent Connected', 'Scanner bridge is now active.', 'success');
        loadDevices();
      } else {
        throw new Error('Agent installed but not yet detected. Try refreshing.');
      }
    } catch (err: unknown) {
      console.error('Installation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setIsInstalling(false);
      showAlert('Setup Failed', `We couldn't install the agent automatically. ${msg}. You may need to download NAPS2 manually from naps2.com.`);
    }
  }, [showAlert, loadDevices]);

  const startScan = useCallback(async () => {
    if (!selectedScanner) return;
    setScanning(true);
    setScanProgress(0);
    
    // Simulate scan progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 98) return 98;
        return prev + 2;
      });
    }, 150);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: selectedScanner.name,
          driver: selectedScanner.driver,
          dpi, colorMode, paperSource, pageSize,
          format: 'jpg'
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Scan failed');
      const data = await res.json();
      setPages(prev => [...prev, ...(data.pages || [])]);
      setScanProgress(100);
      setTimeout(() => setScanProgress(0), 400);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('signal: killed')) return;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      
      showConfirm('Printer Error', `Scanning failed: ${errorMsg}. Would you like to try again?`, () => {
        setTimeout(() => startScanRef.current?.(), 300);
      }, 'danger', 'Retry Scan', 'Dismiss');
    } finally {
      clearInterval(interval);
      setScanning(false);
    }
  }, [selectedScanner, dpi, colorMode, paperSource, pageSize, showConfirm]);

  const cancelScan = useCallback(async () => {
    try {
      await fetch('/api/scan/cancel', { method: 'POST' });
    } catch (err) {
      console.error('Cancel failed', err);
    }
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) setPages(prev => [...prev, data.filename]);
    } catch {
      showAlert('Upload Failed', 'There was an error uploading your file.');
    }
  }, [showAlert]);

  const handleSave = useCallback(async (isEmail = false, onlySelected = false) => {
    const pagesToSave = pages
      .map((name, i) => ({ name, rotation: pageRotations[i] || 0, originalIndex: i }))
      .filter((p) => !onlySelected || selectedPages.has(p.originalIndex));
    
    if (pagesToSave.length === 0) return;
    
    setProcessing(true);
    setSaveMenuOpen(false);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pagesToSave.map(p => ({ name: p.name, rotation: p.rotation })),
          format: fileFormat,
          ocr: ocrEnabled,
          deskew: deskewEnabled,
          email: isEmail ? emailData : null,
          pdfMetadata: fileFormat === 'pdf' ? pdfSettings : null,
          imageQuality: fileFormat === 'jpg' ? imageQuality : 100
        })
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');

      if (!isEmail) {
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = `scan_${Date.now()}.${fileFormat}`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      } else {
        showAlert('Email Sent', 'Your document has been sent successfully.', 'success');
        setEmailModal(false);
      }
    } catch (err: unknown) {
      showAlert('Export Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  }, [pages, selectedPages, pageRotations, fileFormat, ocrEnabled, deskewEnabled, emailData, pdfSettings, imageQuality, showAlert]);

  const togglePageSelection = useCallback((index: number) => {
    setSelectedPages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(index)) newSelection.delete(index);
      else newSelection.add(index);
      return newSelection;
    });
  }, []);

  const movePage = useCallback((index: number, direction: 'left' | 'right') => {
    setPages(prev => {
      const newPages = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPages.length) return prev;
      
      [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
      return newPages;
    });

    setSelectedPages(prev => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      const newSelection = new Set<number>();
      prev.forEach(i => {
        if (i === index) newSelection.add(targetIndex);
        else if (i === targetIndex) newSelection.add(index);
        else newSelection.add(i);
      });
      return newSelection;
    });

    setPageRotations(prev => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      const newRotations = { ...prev };
      const temp = newRotations[index];
      newRotations[index] = newRotations[targetIndex];
      newRotations[targetIndex] = temp;
      return newRotations;
    });
  }, []);

  const deletePage = useCallback((index: number) => {
    const filename = pages[index];
    if (filename) {
      fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: [filename] })
      }).catch(err => console.error('File cleanup failed', err));
    }

    setPages(prev => prev.filter((_, i) => i !== index));
    setSelectedPages(prev => {
      const newSelection = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSelection.add(i);
        else if (i > index) newSelection.add(i - 1);
      });
      return newSelection;
    });

    setPageRotations(prev => {
      const newRotations: Record<number, number> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const i = parseInt(key);
        if (i < index) newRotations[i] = val;
        else if (i > index) newRotations[i - 1] = val;
      });
      return newRotations;
    });
  }, [pages]);



  const clearScan = useCallback(() => {
    showConfirm('Clear Workspace', 'Are you sure you want to remove all scanned pages? This action will permanently delete the temporary files.', () => {
      if (pages.length > 0) {
        fetch('/api/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: pages })
        }).catch(err => console.error('Workspace cleanup failed', err));
      }
      setPages([]);
      setSelectedPages(new Set());
      setConfirmData(null);
    }, 'danger', 'Clear All', 'Cancel');
  }, [showConfirm, pages]);

  const results = {
    scanners,
    selectedScanner,
    setSelectedScanner,
    loading,
    refreshing,
    scanning,
    status,
    refreshProgress,
    scanProgress,
    deviceViewMode,
    setDeviceViewMode,
    paperSource,
    setPaperSource,
    pageSize,
    dpi,
    setDpi,
    colorMode,
    setColorMode,
    fileFormat,
    setFileFormat,
    pages,
    selectedPages,
    pageRotations,
    zoomLevel,
    setZoomLevel,
    ocrEnabled,
    setOcrEnabled,
    deskewEnabled,
    setDeskewEnabled,
    emailModal,
    setEmailModal,
    emailData,
    setEmailData,
    processing,
    saveMenuOpen,
    setSaveMenuOpen,
    pdfSettingsModal,
    setPdfSettingsModal,
    imageSettingsModal,
    setImageSettingsModal,
    pdfSettings,
    setPdfSettings,
    imageQuality,
    setImageQuality,
    confirmData,
    setConfirmData,
    alertData,
    setAlertData,
    saveMenuRef,
    previewBoxRef,
    zoomIn,
    zoomOut,
    showAlert,
    showConfirm,
    agentInstalled,
    setAgentInstalled,
    setupOpen,
    setSetupOpen,
    setupStep,
    isInstalling,
    isMounted,
    loadDevices,
    checkStatus,
    rotateSelected,
    handleInstallAgent,
    startScan,
    cancelScan,
    handleImport,
    handleSave,
    togglePageSelection,
    movePage,
    deletePage,
    deleteSelectedPages,
    clearScan,
    rotatePage,
    theme,
    setTheme,
    isVercel
  };

  // --- Effects (Moved to bottom to avoid hoisting issues) ---
  
  // Handle hydration and environment detection
  useEffect(() => {
    const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    setTimeout(() => {
      setIsMounted(true);
      setIsVercel(isVercelHost);
    }, 0);
  }, []);

  // Initialize from persistence on mount
  useEffect(() => {
    if (!isMounted) return;
    
    const initialize = () => {
      loadExistingFiles();
      const saved = localStorage.getItem('scanner-bridge-installed');
      const savedTheme = localStorage.getItem('scanner-bridge-theme');
      
      if (saved === 'true') {
        setAgentInstalled(true);
      } else {
        setSetupOpen(true);
      }
      if (savedTheme) {
        setTheme(savedTheme);
      }
    };

    setTimeout(initialize, 0);
  }, [isMounted, loadExistingFiles]);

  // Persist installation state and theme
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('scanner-bridge-installed', agentInstalled.toString());
      localStorage.setItem('scanner-bridge-theme', theme);
      if (selectedScanner) {
        localStorage.setItem('scanner-bridge-selected-name', selectedScanner.name);
      }
      if (initialLoadDone) {
        localStorage.setItem('scanner-bridge-session-files', JSON.stringify(pages));
      }
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [agentInstalled, theme, isMounted, selectedScanner, pages, initialLoadDone]);

  useEffect(() => {
    const init = async () => {
      await loadDevices();
      await checkStatus();
      await loadExistingFiles();
    };
    init();
    
    const clickOut = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', clickOut);

    return () => {
      document.removeEventListener('mousedown', clickOut);
    };
  }, [loadDevices, checkStatus, loadExistingFiles]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
        e.preventDefault();
        setSelectedPages(new Set(Array.from({ length: pages.length }, (_, i) => i)));
      }
      
      if (e.key === 'Delete' && selectedPages.size > 0) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
        e.preventDefault();
        showConfirm('Delete Selected', `Are you sure you want to delete ${selectedPages.size} selected pages?`, () => {
          deleteSelectedPages();
          setConfirmData(null);
        }, 'danger', `Delete ${selectedPages.size} ${selectedPages.size === 1 ? 'Page' : 'Pages'}`, 'Cancel');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pages, selectedPages, deleteSelectedPages, showConfirm]);

  // Separate Wheel Zoom Effect to ensure Ref availability
  useEffect(() => {
    if (!isMounted) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    };

    const box = previewBoxRef.current;
    if (box) {
      box.addEventListener('wheel', onWheel as EventListener, { passive: false });
      return () => {
        box.removeEventListener('wheel', onWheel as EventListener);
      };
    }
  }, [isMounted, zoomIn, zoomOut]);

  useEffect(() => {
    startScanRef.current = startScan;
  }, [startScan]);

  return results;
}
