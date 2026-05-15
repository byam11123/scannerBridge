import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Scanner {
  name: string;
  driver: string;
}

interface Page {
  name: string;
  rotation: number;
}

interface ScannerState {
  // --- Core State ---
  scanners: Scanner[];
  selectedScanner: Scanner | null;
  pages: Page[];
  selectedPages: Set<number>;
  
  // --- UI/UX States ---
  loading: boolean;
  refreshing: boolean;
  scanning: boolean;
  isDiscovering: boolean;
  discoveryProgress: number;
  zoomLevel: number;
  deviceViewMode: 'card' | 'select';
  status: { type: string; text: string };
  
  // --- Settings ---
  paperSource: string;
  pageSize: string;
  dpi: string;
  colorMode: string;
  fileFormat: string;
  clearAfterSave: boolean;
  ocrEnabled: boolean;
  deskewEnabled: boolean;
  imageQuality: number;
  
   // --- Modals ---
   emailModal: boolean;
   pdfSettingsModal: boolean;
   imageSettingsModal: boolean;
   confirmData: { open: boolean; title: string; message: string; type: 'danger' | 'info'; onConfirm: () => void } | null;
   alertData: { open: boolean; title: string; message: string; type: 'error' | 'success' } | null;
   emailData: { to: string; subject: string; body: string };
   pdfSettings: { title: string; author: string; subject: string; keywords: string };
   processing: boolean;

  // --- Actions ---
  setScanners: (scanners: Scanner[]) => void;
  setSelectedScanner: (scanner: Scanner | null) => void;
  setPages: (pages: Page[] | ((prev: Page[]) => Page[])) => void;
  setSelectedPages: (pages: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setIsDiscovering: (isDiscovering: boolean) => void;
  setDiscoveryProgress: (progress: number | ((prev: number) => number)) => void;
  setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
  setDeviceViewMode: (mode: 'card' | 'select') => void;
  setStatus: (status: { type: string; text: string }) => void;
  setPaperSource: (source: string) => void;
  setPageSize: (size: string) => void;
  setDpi: (dpi: string) => void;
  setColorMode: (mode: string) => void;
  setFileFormat: (format: string) => void;
  setClearAfterSave: (clear: boolean) => void;
  setOcrEnabled: (enabled: boolean) => void;
  setDeskewEnabled: (enabled: boolean) => void;
  setImageQuality: (quality: number) => void;
  setEmailModal: (open: boolean) => void;
  setPdfSettingsModal: (open: boolean) => void;
  setImageSettingsModal: (open: boolean) => void;
  setConfirmData: (data: { open: boolean; title: string; message: string; type: 'danger' | 'info'; onConfirm: () => void } | null) => void;
  setAlertData: (data: { open: boolean; title: string; message: string; type: 'error' | 'success' } | null) => void;
  setEmailData: (data: { to: string; subject: string; body: string } | ((prev: { to: string; subject: string; body: string }) => { to: string; subject: string; body: string })) => void;
  setPdfSettings: (settings: { title: string; author: string; subject: string; keywords: string } | ((prev: { title: string; author: string; subject: string; keywords: string }) => { title: string; author: string; subject: string; keywords: string })) => void;
  setProcessing: (processing: boolean) => void;
  
  // --- Compound Actions ---
  loadDevices: (force?: boolean) => Promise<void>;
  checkStatus: () => Promise<void>;
  clearScan: () => void;
  startScan: () => Promise<void>;
  cancelScan: () => Promise<void>;
  handleImport: (file: File) => Promise<void>;
  handleSave: (isEmail?: boolean, onlySelected?: boolean) => Promise<void>;
  rotatePage: (index: number, direction: 'cw' | 'ccw') => void;
  movePage: (index: number, direction: 'left' | 'right') => void;
  deletePage: (index: number) => void;
  togglePageSelection: (index: number) => void;
  showAlert: (title: string, message: string, type?: 'error' | 'success') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
}

export const useScannerStore = create<ScannerState>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      scanners: [],
      selectedScanner: null,
      pages: [],
      selectedPages: new Set(),
      loading: true,
      refreshing: false,
      scanning: false,
      isDiscovering: false,
      discoveryProgress: 0,
      zoomLevel: 3,
      deviceViewMode: 'card',
      status: { type: 'pulse', text: 'Connecting...' },
      paperSource: 'Feeder',
      pageSize: 'A4',
      dpi: '300',
      colorMode: 'Color',
      fileFormat: 'pdf',
      clearAfterSave: false,
      ocrEnabled: false,
      deskewEnabled: false,
      imageQuality: 75,
      emailModal: false,
      pdfSettingsModal: false,
      imageSettingsModal: false,
      confirmData: null,
      alertData: null,
      emailData: { to: '', subject: 'Scanned Document', body: 'Please find the attached scanned document.' },
      pdfSettings: { title: 'Scanned Document', author: 'NAPS2 Bridge', subject: 'Scanned Document', keywords: '' },
      processing: false,

      // --- Basic Actions ---
      setScanners: (scanners) => set({ scanners }),
      setSelectedScanner: (selectedScanner) => set({ selectedScanner }),
      setPages: (update) => set((state) => ({ pages: typeof update === 'function' ? update(state.pages) : update })),
      setSelectedPages: (update) => set((state) => ({ selectedPages: typeof update === 'function' ? update(state.selectedPages) : update })),
      setLoading: (loading) => set({ loading }),
      setRefreshing: (refreshing) => set({ refreshing }),
      setScanning: (scanning) => set({ scanning }),
      setIsDiscovering: (isDiscovering) => set({ isDiscovering }),
      setDiscoveryProgress: (update) => set((state) => ({ discoveryProgress: typeof update === 'function' ? update(state.discoveryProgress) : update })),
      setZoomLevel: (update) => set((state) => ({ zoomLevel: typeof update === 'function' ? update(state.zoomLevel) : update })),
      setDeviceViewMode: (deviceViewMode) => set({ deviceViewMode }),
      setStatus: (status) => set({ status }),
      setPaperSource: (paperSource) => set({ paperSource }),
      setPageSize: (pageSize) => set({ pageSize }),
      setDpi: (dpi) => set({ dpi }),
      setColorMode: (colorMode) => set({ colorMode }),
      setFileFormat: (fileFormat) => set({ fileFormat }),
      setClearAfterSave: (clearAfterSave) => set({ clearAfterSave }),
      setOcrEnabled: (ocrEnabled) => set({ ocrEnabled }),
      setDeskewEnabled: (deskewEnabled) => set({ deskewEnabled }),
      setImageQuality: (imageQuality) => set({ imageQuality }),
      setEmailModal: (emailModal) => set({ emailModal }),
      setPdfSettingsModal: (pdfSettingsModal) => set({ pdfSettingsModal }),
      setImageSettingsModal: (imageSettingsModal) => set({ imageSettingsModal }),
      setConfirmData: (confirmData) => set({ confirmData }),
      setAlertData: (alertData) => set({ alertData }),
      setEmailData: (update) => set((state) => ({ emailData: typeof update === 'function' ? update(state.emailData) : update })),
      setPdfSettings: (update) => set((state) => ({ pdfSettings: typeof update === 'function' ? update(state.pdfSettings) : update })),
      setProcessing: (processing) => set({ processing }),

      // --- Compound Actions ---
      showAlert: (title, message, type = 'error') => {
        set({ alertData: { open: true, title, message, type } });
      },

      showConfirm: (title, message, onConfirm, type = 'danger') => {
        set({ confirmData: { open: true, title, message, onConfirm, type } });
      },

      checkStatus: async () => {
        try {
          const res = await fetch('/api/status');
          const data = await res.json();
          if (data.status === 'online') set({ status: { type: 'green', text: 'Bridge Online' } });
          else set({ status: { type: 'red', text: 'NAPS2 Missing' } });
        } catch {
          set({ status: { type: 'red', text: 'Server Offline' } });
        }
      },

      loadDevices: async (force = false) => {
        set({ refreshing: true });
        if (force) {
          set({ loading: true, isDiscovering: true, discoveryProgress: 0 });
          
          const interval = setInterval(() => {
            set((state) => {
              if (state.discoveryProgress >= 98) return state;
              const inc = Math.random() * 2;
              return { discoveryProgress: Math.min(state.discoveryProgress + inc, 99) };
            });
          }, 500);
          
          try {
            const res = await fetch(`/api/scanners?refresh=true`);
            const data = await res.json();
            const found: Scanner[] = data.scanners || [];
            set({ scanners: found });
            if (found.length > 0) {
              const current = get().selectedScanner;
              if (!current || !found.find(s => s.name === current.name)) {
                set({ selectedScanner: found[0] });
              }
            }
            set({ discoveryProgress: 100 });
          } catch {
            console.error('Failed to load devices');
          } finally {
            clearInterval(interval);
            setTimeout(() => {
              set({ isDiscovering: false, loading: false, refreshing: false });
            }, 800);
          }
        } else {
          try {
            const res = await fetch(`/api/scanners`);
            const data = await res.json();
            const found: Scanner[] = data.scanners || [];
            set({ scanners: found });
            if (found.length > 0 && !get().selectedScanner) {
              set({ selectedScanner: found[0] });
            }
          } catch {
            console.error('Failed to load devices');
          } finally {
            set({ loading: false, refreshing: false });
          }
        }
      },

      startScan: async () => {
        const { selectedScanner, dpi, colorMode, paperSource, pageSize } = get();
        if (!selectedScanner) return;
        set({ scanning: true });
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
          const newPages = (data.pages || []).map((p: string) => ({ name: p, rotation: 0 }));
          set((state) => ({ pages: [...state.pages, ...newPages] }));
        } catch (err) {
          const error = err as Error;
          if (error.message.includes('signal: killed')) return;
          
          get().showConfirm(
            'Device Not Responding', 
            'It looks like your scanner is disconnected or busy. Would you like to refresh the hardware list now?',
            () => get().loadDevices(true),
            'info'
          );
        } finally {
          set({ scanning: false });
        }
      },

      cancelScan: async () => {
        try {
          await fetch('/api/scan/cancel', { method: 'POST' });
        } catch {
          console.error('Cancel failed');
        }
      },

      handleImport: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) set((state) => ({ pages: [...state.pages, { name: data.filename, rotation: 0 }] }));
        } catch {
          get().showAlert('Upload Failed', 'There was an error uploading your file.');
        }
      },

      handleSave: async (isEmail = false, onlySelected = false) => {
        const { pages, selectedPages, fileFormat, ocrEnabled, deskewEnabled, emailData, pdfSettings, imageQuality, clearAfterSave } = get();
        const pagesToSave = onlySelected ? pages.filter((_, i) => selectedPages.has(i)) : pages;
        if (pagesToSave.length === 0) return;
        
        set({ processing: true });
        try {
          const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pages: pagesToSave,
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
            const data = await res.json();
            if (!data.filename) throw new Error('No filename returned from server.');
            
            const downloadUrl = `/api/file/${data.filename}?download=true`;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = data.filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 100);
          } else {
            get().showAlert('Email Sent', 'Your document has been sent successfully.', 'success');
            set({ emailModal: false });
          }

          if (clearAfterSave) {
            set({ pages: [], selectedPages: new Set() });
          }
        } catch (err) {
          const error = err as Error;
          get().showAlert('Export Failed', error.message);
        } finally {
          set({ processing: false });
        }
      },

      rotatePage: (index, direction) => {
        set((state) => {
          const next = [...state.pages];
          const currentRot = next[index].rotation;
          next[index].rotation = (direction === 'cw' ? currentRot + 90 : currentRot - 90) % 360;
          return { pages: next };
        });
      },

      movePage: (index, direction) => {
        set((state) => {
          const next = [...state.pages];
          const targetIndex = direction === 'left' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= next.length) return state;
          
          [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
          
          const newSelection = new Set<number>();
          state.selectedPages.forEach(i => {
            if (i === index) newSelection.add(targetIndex);
            else if (i === targetIndex) newSelection.add(index);
            else newSelection.add(i);
          });
          
          return { pages: next, selectedPages: newSelection };
        });
      },

      deletePage: (index) => {
        set((state) => {
          const nextPages = state.pages.filter((_, i) => i !== index);
          const nextSelection = new Set<number>();
          state.selectedPages.forEach(i => {
            if (i < index) nextSelection.add(i);
            else if (i > index) nextSelection.add(i - 1);
          });
          return { pages: nextPages, selectedPages: nextSelection };
        });
      },

      togglePageSelection: (index) => {
        set((state) => {
          const next = new Set(state.selectedPages);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return { selectedPages: next };
        });
      },

      clearScan: () => {
        get().showConfirm('Clear Workspace', 'Are you sure you want to remove all scanned pages? This action cannot be undone.', () => {
          set({ pages: [], selectedPages: new Set(), confirmData: null });
        });
      },
    }),
    {
      name: 'scanner-bridge-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        paperSource: state.paperSource,
        pageSize: state.pageSize,
        dpi: state.dpi,
        colorMode: state.colorMode,
        clearAfterSave: state.clearAfterSave,
        zoomLevel: state.zoomLevel,
        deviceViewMode: state.deviceViewMode,
        scanners: state.scanners,
        selectedScanner: state.selectedScanner,
      }),
    }
  )
);
