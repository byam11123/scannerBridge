'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  FileUp, 
  Search, 
  Box, 
  Download, 
  Mail, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Settings2,
  X,
  FileText,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FileImage,
  Check,
  ChevronRightSquare,
  MoreVertical,
  ZoomIn,
  ZoomOut,
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
  
  // Settings
  const [paperSource, setPaperSource] = useState('Feeder');
  const [pageSize, setPageSize] = useState('A4');
  const [dpi, setDpi] = useState('300');
  const [colorMode, setColorMode] = useState('Color');
  const [fileFormat, setFileFormat] = useState('pdf');
  
  // Result & UI State
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
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

  useEffect(() => {
    loadDevices();
    checkStatus();
    
    const clickOut = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    
    // Ctrl + Wheel Zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    };
    
    const box = previewBoxRef.current;
    if (box) {
      box.addEventListener('wheel', handleWheel as any, { passive: false });
    }

    return () => {
      document.removeEventListener('mousedown', clickOut);
      if (box) box.removeEventListener('wheel', handleWheel as any);
    };
  }, []);

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertData({ open: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger') => {
    setConfirmData({ open: true, title, message, onConfirm, type });
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') setStatus({ type: 'green', text: 'Bridge Online' });
      else setStatus({ type: 'red', text: 'NAPS2 Missing' });
    } catch {
      setStatus({ type: 'red', text: 'Server Offline' });
    }
  };

  const loadDevices = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch('/api/scanners');
      const data = await res.json();
      setScanners(data.scanners || []);
      if (data.scanners?.length > 0 && !selectedScanner) setSelectedScanner(data.scanners[0]);
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    } catch (err: any) {
      if (err.message.includes('signal: killed')) return;
      showAlert('Scanning Failed', err.message);
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
    } catch (err) {
      showAlert('Upload Failed', 'There was an error uploading your file.');
    }
  };

  const handleSave = async (isEmail = false, onlySelected = false) => {
    const pagesToSave = onlySelected ? pages.filter((_, i) => selectedPages.has(i)) : pages;
    if (pagesToSave.length === 0) return;
    
    setProcessing(true);
    setSaveMenuOpen(false);
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
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scan_${Date.now()}.${fileFormat}`;
        a.click();
      } else {
        showAlert('Email Sent', 'Your document has been sent successfully.', 'success');
        setEmailModal(false);
      }
    } catch (err: any) {
      showAlert('Export Failed', err.message);
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
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
    const newSelection = new Set<number>();
    selectedPages.forEach(i => {
      if (i === index) newSelection.add(targetIndex);
      else if (i === targetIndex) newSelection.add(index);
      else newSelection.add(i);
    });
    setSelectedPages(newSelection);
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
  };

  const clearScan = () => {
    showConfirm('Clear Workspace', 'Are you sure you want to remove all scanned pages? This action cannot be undone.', () => {
      setPages([]);
      setSelectedPages(new Set());
      setConfirmData(null);
    });
  };

  const zoomIn = () => setZoomLevel(prev => Math.max(1, prev - 1));
  const zoomOut = () => setZoomLevel(prev => Math.min(8, prev + 1));

  return (
    <div className={styles.container}>
      {/* ── SIDEBAR ── */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <Scan size={24} className={styles.deviceIcon} />
          <span>Scanner Bridge</span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Select Device</div>
          <div className={styles.deviceList}>
            {loading ? (
              <div className="shimmer" style={{ height: 60, borderRadius: 8 }}></div>
            ) : scanners.length > 0 ? (
              scanners.map((dev, i) => (
                <div 
                  key={i} 
                  className={`${styles.deviceCard} ${selectedScanner?.name === dev.name ? styles.deviceCardSelected : ''}`}
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
            )}
          </div>
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

          <div className={styles.toolSep}></div>

          <button className={`${styles.toolBtn} ${ocrEnabled ? styles.toolBtnActive : ''}`} onClick={() => setOcrEnabled(!ocrEnabled)}>
            <Search size={18} />
            <span>OCR</span>
          </button>
          <button className={`${styles.toolBtn} ${deskewEnabled ? styles.toolBtnActive : ''}`} onClick={() => setDeskewEnabled(!deskewEnabled)}>
            <Settings2 size={18} />
            <span>Deskew</span>
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

          <div className={styles.zoomControls}>
            <button className={styles.zoomBtn} onClick={zoomOut} disabled={zoomLevel === 8} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button className={styles.zoomBtn} onClick={zoomIn} disabled={zoomLevel === 1} title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className={styles.toolSep}></div>

          <button className={styles.toolBtn} onClick={clearScan} disabled={pages.length === 0}>
            <Trash2 size={18} />
          </button>
        </div>

        <div className={styles.previewBox} ref={previewBoxRef}>
          {pages.length > 0 ? (
            <div className={styles.gridContainer} style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}>
              {pages.map((page, i) => (
                <div 
                  key={`${page}-${i}`} 
                  className={`${styles.pageCard} ${selectedPages.has(i) ? styles.pageCardSelected : ''}`}
                  onClick={() => togglePageSelection(i)}
                >
                  <img src={`/api/file/${page}`} className={styles.pageImg} alt={`Page ${i+1}`} loading="lazy" />
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
      </div>

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
            <div className={`${styles.confirmIcon} ${alertData.type === 'success' ? styles.sdotGreen : styles.confirmIcon}`} style={{ background: alertData.type === 'success' ? '#10b9811a' : '#ef44441a', color: alertData.type === 'success' ? '#10b981' : '#ef4444' }}>
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
