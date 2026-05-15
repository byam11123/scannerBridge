'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Scan, 
  FileUp, 
  Search, 
  Box, 
  Mail, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Settings2,
  Zap,
  X,
  FileText,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FileImage,
  ChevronRightSquare,
  ZoomIn,
  ZoomOut,
  RotateCw,
  LayoutGrid,
  List,
  StopCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import styles from './ScannerBridge.module.css';

interface Scanner {
  name: string;
  driver: string;
}

// Custom Select Component
function CustomSelect({ label, value, options, onChange }: { 
  label: string, 
  value: string, 
  options: { value: string, label: string }[], 
  onChange: (val: string) => void 
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  return (
    <div className={styles.field} ref={ref}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.customSelect}>
        <div className={styles.selectTrigger} onClick={() => setOpen(!open)}>
          <span>{options.find(o => o.value === value)?.label || value}</span>
          <ChevronDown size={14} className={styles.muted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
        {open && (
          <div className={styles.selectContent}>
            {options.map(opt => (
              <div 
                key={opt.value} 
                className={`${styles.selectItem} ${value === opt.value ? styles.selectItemActive : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScannerBridge() {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<Scanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState({ type: 'pulse', text: 'Connecting...' });
  const [refreshProgress, setRefreshProgress] = useState(0);
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
  const [emailData, setEmailData] = useState({ to: '', subject: 'Scanned Document', body: 'Please find the attached scanned document.' });
  const [processing, setProcessing] = useState(false);
  
  // Dropdown & Settings States
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [pdfSettingsModal, setPdfSettingsModal] = useState(false);
  const [imageSettingsModal, setImageSettingsModal] = useState(false);
  
  const [pdfSettings, setPdfSettings] = useState({
    title: 'Scanned Document',
    author: 'NAPS2 Bridge',
    subject: 'Scanned Document',
    keywords: ''
  });
  const [imageQuality, setImageQuality] = useState(75);

  // Custom Dialog States
  const [confirmData, setConfirmData] = useState<{ open: boolean; title: string; message: string; type: 'danger' | 'info'; onConfirm: () => void } | null>(null);
  const [alertData, setAlertData] = useState<{ open: boolean; title: string; message: string; type: 'error' | 'success' } | null>(null);

  const saveMenuRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoomLevel(prev => Math.max(1, prev - 1));
  const zoomOut = () => setZoomLevel(prev => Math.min(8, prev + 1));

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertData({ open: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger') => {
    setConfirmData({ open: true, title, message, onConfirm, type });
  };

  // Local Agent Setup State
  const [agentInstalled, setAgentInstalled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  // Initialize from persistence on mount
  useEffect(() => {
    if (!isMounted) return;
    const saved = localStorage.getItem('scanner-bridge-installed');
    setTimeout(() => {
      if (saved === 'true') {
        setAgentInstalled(true);
      } else {
        setSetupOpen(true);
      }
    }, 0);
  }, [isMounted]);

  // Persist installation state
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('scanner-bridge-installed', agentInstalled.toString());
    }
  }, [agentInstalled, isMounted]);

  const loadDevices = React.useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setRefreshProgress(0);

    // Simulate progress animation
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
      setScanners(data.scanners || []);
      if (data.scanners?.length > 0 && !selectedScanner) setSelectedScanner(data.scanners[0]);
      
      // Complete animation
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
  }, [selectedScanner]);

  const checkStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') setStatus({ type: 'green', text: 'Bridge Online' });
      else setStatus({ type: 'red', text: 'NAPS2 Missing' });
    } catch {
      setStatus({ type: 'red', text: 'Server Offline' });
    }
  }, []);

  useEffect(() => {
    // Call async functions
    const init = async () => {
      await loadDevices();
      await checkStatus();
    };
    init();
    
    const clickOut = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    
    // Ctrl + Wheel Zoom
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
    }

    return () => {
      document.removeEventListener('mousedown', clickOut);
      if (box) box.removeEventListener('wheel', onWheel as EventListener);
    };
  }, [loadDevices, checkStatus]);

  const rotateSelected = () => {
    if (selectedPages.size === 0) return;
    const newRotations = { ...pageRotations };
    selectedPages.forEach(index => {
      newRotations[index] = (newRotations[index] || 0) + 90;
    });
    setPageRotations(newRotations);
  };

  const handleInstallAgent = async () => {
    setIsInstalling(true);
    setSetupStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setSetupStep(2);
    await new Promise(r => setTimeout(r, 1800));
    setSetupStep(3);
    
    // Final check
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') {
        setIsInstalling(false);
        setAgentInstalled(true);
        setSetupOpen(false);
        showAlert('Agent Connected', 'Scanner bridge is now active.', 'success');
        loadDevices();
      } else {
        throw new Error('Not connected');
      }
    } catch {
      setIsInstalling(false);
      showAlert('Connection Failed', 'Could not detect the local agent. Please make sure it is running.');
    }
  };

  const startScan = async () => {
    if (!selectedScanner) return;
    setScanning(true);
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
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('signal: killed')) return;
      showAlert('Scanning Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  const cancelScan = async () => {
    try {
      await fetch('/api/scan/cancel', { method: 'POST' });
    } catch (err) {
      console.error('Cancel failed', err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleSave = async (isEmail = false, onlySelected = false) => {
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
  };

  const togglePageSelection = (index: number) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(index)) newSelection.delete(index);
    else newSelection.add(index);
    setSelectedPages(newSelection);
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    const newPages = [...pages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    
    // Swap pages
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
    
    // Swap selections
    const newSelection = new Set<number>();
    selectedPages.forEach(i => {
      if (i === index) newSelection.add(targetIndex);
      else if (i === targetIndex) newSelection.add(index);
      else newSelection.add(i);
    });
    setSelectedPages(newSelection);

    // Swap rotations
    const newRotations = { ...pageRotations };
    const temp = newRotations[index];
    newRotations[index] = newRotations[targetIndex];
    newRotations[targetIndex] = temp;
    setPageRotations(newRotations);
  };

  const deletePage = (index: number) => {
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    const newSelection = new Set<number>();
    selectedPages.forEach(i => {
      if (i < index) newSelection.add(i);
      else if (i > index) newSelection.add(i - 1);
    });
    setSelectedPages(newSelection);

    // Sync rotations
    const newRotations: Record<number, number> = {};
    Object.entries(pageRotations).forEach(([key, val]) => {
      const i = parseInt(key);
      if (i < index) newRotations[i] = val;
      else if (i > index) newRotations[i - 1] = val;
    });
    setPageRotations(newRotations);
  };

  const clearScan = () => {
    showConfirm('Clear Workspace', 'Are you sure you want to remove all scanned pages? This action cannot be undone.', () => {
      setPages([]);
      setSelectedPages(new Set());
      setConfirmData(null);
    });
  };



  return (
    <div className={styles.container}>
      {/* ── SIDEBAR ── */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <Scan size={24} className={styles.deviceIcon} />
          <span>Scanner Bridge</span>
        </div>

        <div className={styles.section}>
          <div className={styles.refreshHeader}>
            <div className={styles.sectionTitle}>Scanner Bridge</div>
            <button 
              className={styles.refreshBtn} 
              onClick={() => setSetupOpen(true)}
              title="Agent Settings"
            >
              <Settings2 size={14} />
            </button>
          </div>
          
          {!agentInstalled ? (
            <div className={styles.setupCard}>
              <Zap size={20} className={styles.setupIcon} />
              <p>Agent Required</p>
              <button onClick={() => setSetupOpen(true)}>Start Setup</button>
            </div>
          ) : (
            <div className={styles.deviceList}>
              <div className={styles.refreshHeader}>
                <div className={styles.sectionTitle}>Select Device</div>
                <button 
                  className={styles.refreshBtn} 
                  onClick={loadDevices} 
                  disabled={refreshing}
                  title="Refresh device list"
                >
                  <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
                </button>
              </div>

              {refreshProgress > 0 && (
                <div className={styles.progressBarMini}>
                  <div 
                    className={styles.progressBarMiniInner} 
                    style={{ width: `${refreshProgress}%` }}
                  ></div>
                </div>
              )}

              <div className={styles.viewToggle}>
                <button 
                  className={`${styles.viewToggleBtn} ${deviceViewMode === 'default' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setDeviceViewMode('default')}
                >
                  <LayoutGrid size={12} style={{ marginRight: 4 }} />
                  Default
                </button>
                <button 
                  className={`${styles.viewToggleBtn} ${deviceViewMode === 'compact' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setDeviceViewMode('compact')}
                >
                  <List size={12} style={{ marginRight: 4 }} />
                  Compact
                </button>
              </div>

              <div className={styles.deviceListInner}>
                {loading && refreshProgress === 0 ? (
                  <div className="shimmer" style={{ height: 60, borderRadius: 8 }}></div>
                ) : deviceViewMode === 'default' ? (
                  scanners.length > 0 ? (
                    scanners.map((dev, i) => (
                      <div 
                        key={i} 
                        className={`${styles.deviceCard} ${selectedScanner?.name === dev.name && selectedScanner?.driver === dev.driver ? styles.deviceCardSelected : ''}`}
                        onClick={() => setSelectedScanner(dev)}
                      >
                        <div className={styles.deviceIcon}>
                          <Monitor size={20} />
                        </div>
                        <div className={styles.deviceInfo}>
                          <div className={styles.deviceName}>{dev.name}</div>
                          <div className={styles.deviceSub}>{dev.driver.toUpperCase()} Bridge</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.deviceSub}>No scanners detected</div>
                  )
                ) : (
                  <div className={styles.deviceSub}>Select from list above</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Configuration</div>
          
          <CustomSelect 
            label="Source" 
            value={paperSource} 
            options={[
              { value: 'Feeder', label: 'Document Feeder' },
              { value: 'Flatbed', label: 'Flatbed' },
              { value: 'Duplex', label: 'Duplex (Both sides)' }
            ]} 
            onChange={setPaperSource} 
          />

          <CustomSelect 
            label="Resolution" 
            value={dpi} 
            options={[
              { value: '100', label: '100 DPI (Draft)' },
              { value: '150', label: '150 DPI (Fast)' },
              { value: '200', label: '200 DPI (Web)' },
              { value: '300', label: '300 DPI (Standard)' },
              { value: '400', label: '400 DPI (High)' },
              { value: '600', label: '600 DPI (Photo)' },
              { value: '1200', label: '1200 DPI (Archive)' }
            ]} 
            onChange={setDpi} 
          />

          <CustomSelect 
            label="Color Mode" 
            value={colorMode} 
            options={[
              { value: 'Color', label: 'Full Color' },
              { value: 'Gray', label: 'Grayscale' },
              { value: 'BlackWhite', label: 'Black & White' }
            ]} 
            onChange={setColorMode} 
          />
        </div>

        <div className={styles.statusbar}>
          {status.type === 'green' ? <CheckCircle2 size={14} className={styles.sdotGreen} /> : <AlertCircle size={14} className={styles.sdotRed} />}
          <span>{status.text}</span>
        </div>

        <button className={styles.scanBtn} onClick={startScan} disabled={!selectedScanner || scanning}>
          {scanning ? <RefreshCw className={styles.spinning} size={18} /> : <Scan size={18} />}
          {scanning ? 'Scan in Progress...' : 'Start New Scan'}
        </button>
      </div>

      {/* ── PREVIEW AREA ── */}
      <div className={styles.previewArea}>
        <div className={styles.toolbar}>
          <button className={styles.toolBtn} onClick={() => document.getElementById('import-file')?.click()}>
            <FileUp size={18} />
            <span>Import</span>
          </button>
          <input type="file" id="import-file" hidden onChange={handleImport} accept="image/*,application/pdf" />

          <button className={`${styles.toolBtn} ${ocrEnabled ? styles.toolBtnActive : ''}`} onClick={() => setOcrEnabled(!ocrEnabled)}>
            <Search size={18} />
            <span>OCR</span>
          </button>
          <button className={`${styles.toolBtn} ${deskewEnabled ? styles.toolBtnActive : ''}`} onClick={() => setDeskewEnabled(!deskewEnabled)}>
            <Settings2 size={18} />
            <span>Deskew</span>
          </button>

          <div className={styles.toolSep}></div>

          <button className={styles.toolBtn} onClick={rotateSelected} disabled={selectedPages.size === 0}>
            <RotateCw size={18} className={styles.rotationIcon} />
            <span>Rotate</span>
          </button>

          <div className={styles.toolSep}></div>

          <div className={styles.formatToggle}>
            <button 
              className={`${styles.formatBtn} ${fileFormat === 'pdf' ? styles.formatBtnActive : ''}`}
              onClick={() => setFileFormat('pdf')}
            >
              PDF
            </button>
            <button 
              className={`${styles.formatBtn} ${fileFormat === 'jpg' ? styles.formatBtnActive : ''}`}
              onClick={() => setFileFormat('jpg')}
            >
              JPG
            </button>
          </div>

          <div className={styles.dropdownWrapper} ref={saveMenuRef}>
            <div className={styles.saveGroup}>
              <button 
                className={styles.saveMain} 
                onClick={() => handleSave(false, false)}
                disabled={processing || pages.length === 0}
              >
                {fileFormat === 'pdf' ? <FileText size={18} /> : <FileImage size={18} />}
                <span>{processing ? 'Wait...' : 'Save'}</span>
              </button>
              <button 
                className={styles.saveCaret} 
                onClick={() => setSaveMenuOpen(!saveMenuOpen)}
                disabled={pages.length === 0}
              >
                <ChevronDown size={14} />
              </button>
            </div>
            
            {saveMenuOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownItem} onClick={() => handleSave(false, false)}>
                  <Box size={14} />
                  <span>Save All <span className={styles.dropdownSub}>({pages.length})</span></span>
                </div>
                <div 
                  className={styles.dropdownItem} 
                  onClick={() => handleSave(false, true)}
                  style={{ opacity: selectedPages.size === 0 ? 0.5 : 1, pointerEvents: selectedPages.size === 0 ? 'none' : 'auto' }}
                >
                  <ChevronRightSquare size={14} />
                  <span>Save Selected <span className={styles.dropdownSub}>({selectedPages.size})</span></span>
                </div>
                <div className={styles.dropdownSep}></div>
                <div className={styles.dropdownItem} onClick={() => {
                  if (fileFormat === 'pdf') setPdfSettingsModal(true);
                  else setImageSettingsModal(true);
                  setSaveMenuOpen(false);
                }}>
                  <Settings2 size={14} />
                  <span>{fileFormat.toUpperCase()} Settings</span>
                </div>
              </div>
            )}
          </div>
          
          <button className={styles.toolBtn} onClick={() => setEmailModal(true)} disabled={pages.length === 0}>
            <Mail size={18} />
            <span>Email</span>
          </button>

          <div className={styles.toolSep}></div>

          <div className={styles.zoomControls}>
            <button className={styles.zoomBtn} onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}><ZoomOut size={14} /></button>
            <div className={styles.zoomLevel}>{zoomLevel}x</div>
            <button className={styles.zoomBtn} onClick={() => setZoomLevel(Math.min(6, zoomLevel + 1))}><ZoomIn size={14} /></button>
          </div>

          <button className={`${styles.toolBtn} ${styles.toolBtnDanger}`} onClick={clearScan} disabled={pages.length === 0}>
            <Trash2 size={18} />
          </button>
        </div>

        <div className={styles.previewBox} ref={previewBoxRef}>
          {pages.length > 0 ? (
            <div className={styles.gridContainer} style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}>
              {pages.map((page, i) => (
                <div 
                  key={i} 
                  className={`${styles.pageCard} ${selectedPages.has(i) ? styles.pageCardSelected : ''}`}
                  onClick={() => togglePageSelection(i)}
                >
                  <Image 
                    src={page} 
                    alt={`Page ${i+1}`} 
                    width={400} 
                    height={600} 
                    className={styles.pageImage} 
                    style={{ transform: `rotate(${pageRotations[i] || 0}deg)` }}
                  />
                  <div className={styles.pageNumber}>Page {i+1}</div>
                  <div className={styles.pageOverlay}>
                    <button className={styles.pageActionBtn} onClick={(e) => { e.stopPropagation(); movePage(i, 'left'); }}><ChevronLeft size={18} /></button>
                    <button className={`${styles.pageActionBtn} ${styles.pageActionBtnDel}`} onClick={(e) => { e.stopPropagation(); deletePage(i); }}><Trash2 size={18} /></button>
                    <button className={styles.pageActionBtn} onClick={(e) => { e.stopPropagation(); movePage(i, 'right'); }}><ChevronRight size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              {scanning ? (
                <div className={styles.scanningOverlay}>
                  <div className={styles.scanLine}></div>
                  <div className={styles.emptyTitle}>Scanning in Progress...</div>
                </div>
              ) : (
                <>
                  <Box size={48} className={styles.emptyIcon} />
                  <div className={styles.emptyTitle}>Ready to Scan</div>
                  <div className={styles.emptySub}>Connect your scanner and start digitizing your documents today.</div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          BUILT BY BYAMKESH KAIWARTYA
        </div>
      </div>

      {/* ── SETUP SIDEBAR ── */}
      {setupOpen && (
        <>
          <div className={styles.modalOverlay} onClick={() => !isInstalling && setSetupOpen(false)} />
          <div className={styles.setupSidebar}>
            <div className={styles.setupHeader}>
              <div>
                <h3>Agent Setup</h3>
                <p>Bridge your browser to local hardware</p>
              </div>
              <button onClick={() => setSetupOpen(false)}><X size={20} /></button>
            </div>

            <div className={styles.setupBody}>
              {[
                { id: 1, label: 'Download Agent', desc: 'Secure connector app (~2MB)' },
                { id: 2, label: 'Run Installer', desc: 'One-click background service' },
                { id: 3, label: 'Detect Scanners', desc: 'Hardware synchronization' }
              ].map(s => (
                <div key={s.id} className={styles.stepRow}>
                  <div className={`${styles.stepDot} ${agentInstalled || setupStep > s.id ? styles.stepDone : setupStep === s.id && isInstalling ? styles.stepActive : ''}`}>
                    {agentInstalled || setupStep > s.id ? '✓' : s.id}
                  </div>
                  <div>
                    <div className={styles.stepLabel}>{s.label}</div>
                    <div className={styles.stepDesc}>{s.desc}</div>
                  </div>
                </div>
              ))}

              <div className={styles.setupInfo}>
                <strong>Why is this needed?</strong>
                <p>Browsers are sandboxed for safety. This agent bridges your computer&apos;s drivers (WIA/TWAIN) to the web interface securely.</p>
              </div>

              {agentInstalled && (
                <button className={styles.resetBtn} onClick={() => { setAgentInstalled(false); localStorage.removeItem('scanner-bridge-installed'); }}>
                  Remove Agent
                </button>
              )}
            </div>

            {!agentInstalled && (
              <div className={styles.setupFooter}>
                <button 
                  className={styles.primaryBtn} 
                  onClick={handleInstallAgent}
                  disabled={isInstalling}
                >
                  {isInstalling ? 'Installing Agent...' : '⚡ Download & Start Agent'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FLOATING SCAN PROGRESS ── */}
      {scanning && (
        <div className={styles.floatingProgress}>
          <div className={styles.progressHeader}>
            <Scan size={20} className={`${styles.progressIcon} ${styles.spinning}`} />
            <div className={styles.progressTitle}>Scanning Document</div>
            <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={cancelScan}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.progressBody}>
            <div className={styles.progressSub}>
              {selectedScanner?.name}
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBar}></div>
            </div>
            <div className={styles.progressSub}>Capturing pages from {paperSource}...</div>
          </div>
          <button className={styles.cancelBtn} onClick={cancelScan}>
            <StopCircle size={16} />
            <span>Cancel Hardware Scan</span>
          </button>
        </div>
      )}

      {/* ── EMAIL MODAL ── */}
      {emailModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <span>Email Document</span>
              <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={() => setEmailModal(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label>Recipient Address</label>
                <input type="email" value={emailData.to} onChange={e => setEmailData({...emailData, to: e.target.value})} placeholder="name@example.com" />
              </div>
              <div className={styles.inputGroup}>
                <label>Subject Line</label>
                <input type="text" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Message Content</label>
                <textarea rows={4} value={emailData.body} onChange={e => setEmailData({...emailData, body: e.target.value})} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={() => setEmailModal(false)}>Cancel</button>
              <button className={styles.primaryBtn} onClick={() => handleSave(true)} disabled={processing}>
                {processing ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF SETTINGS MODAL ── */}
      {pdfSettingsModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <span>PDF Document Settings</span>
              <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={() => setPdfSettingsModal(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label>Document Title</label>
                  <input type="text" value={pdfSettings.title} onChange={e => setPdfSettings({...pdfSettings, title: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Author</label>
                  <input type="text" value={pdfSettings.author} onChange={e => setPdfSettings({...pdfSettings, author: e.target.value})} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Subject</label>
                <input type="text" value={pdfSettings.subject} onChange={e => setPdfSettings({...pdfSettings, subject: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Keywords</label>
                <input type="text" value={pdfSettings.keywords} onChange={e => setPdfSettings({...pdfSettings, keywords: e.target.value})} placeholder="scanned, document, etc." />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.primaryBtn} onClick={() => setPdfSettingsModal(false)}>Apply Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE SETTINGS MODAL ── */}
      {imageSettingsModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <span>JPEG Image Settings</span>
              <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={() => setImageSettingsModal(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.sliderGroup}>
                <div className={styles.fieldLabel}>JPEG Compression Quality</div>
                <div className={styles.sliderRow}>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={imageQuality} 
                    onChange={e => setImageQuality(parseInt(e.target.value))} 
                  />
                  <div className={styles.sliderValue}>{imageQuality}%</div>
                </div>
                <div className={styles.deviceSub}>Higher quality results in larger file sizes.</div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.primaryBtn} onClick={() => setImageSettingsModal(false)}>Apply Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION MODAL ── */}
      {confirmData?.open && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${styles.confirmContent}`}>
            <div className={`${styles.confirmIcon} ${confirmData.type === 'info' ? styles.alertIcon : ''}`}>
              {confirmData.type === 'danger' ? <Trash2 size={28} /> : <Info size={28} />}
            </div>
            <div className={styles.confirmTitle}>{confirmData.title}</div>
            <div className={styles.confirmMessage}>{confirmData.message}</div>
            <div className={styles.modalFooter} style={{ justifyContent: 'center' }}>
              <button className={styles.secondaryBtn} onClick={() => setConfirmData(null)}>Cancel</button>
              <button 
                className={styles.primaryBtn} 
                style={{ background: confirmData.type === 'danger' ? '#ef4444' : 'var(--primary)', color: confirmData.type === 'danger' ? 'white' : '#000' }}
                onClick={confirmData.onConfirm}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM ALERT MODAL ── */}
      {alertData?.open && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${styles.confirmContent}`}>
            <div className={`${styles.confirmIcon} ${alertData.type === 'success' ? styles.sdotGreen : styles.confirmIcon}`} style={{ background: alertData.type === 'success' ? '#10b9811a' : '#ef44441a' }}>
              {alertData.type === 'success' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
            </div>
            <div className={styles.confirmTitle}>{alertData.title}</div>
            <div className={styles.confirmMessage}>{alertData.message}</div>
            <div className={styles.modalFooter} style={{ justifyContent: 'center' }}>
              <button className={styles.primaryBtn} onClick={() => setAlertData(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
