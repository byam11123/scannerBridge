'use client';

import React, { useState, useEffect } from 'react';
import styles from './ScannerBridge.module.css';

interface Scanner {
  name: string;
  driver: string;
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
  const [colorMode, setColorMode] = useState('Gray');
  const [fileFormat, setFileFormat] = useState('jpg');
  
  // Result
  const [pages, setPages] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(3); // Column count
  const [pdfName, setPdfName] = useState('');

  useEffect(() => {
    loadDevices();
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') {
        setStatus({ type: 'green', text: 'Bridge Online' });
      } else {
        setStatus({ type: 'red', text: 'NAPS2 Missing' });
      }
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
      if (data.scanners?.length > 0 && !selectedScanner) {
        setSelectedScanner(data.scanners[0]);
      }
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
    setPages([]);
    
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: selectedScanner.name,
          driver: selectedScanner.driver,
          dpi,
          colorMode,
          paperSource,
          pageSize,
          format: fileFormat
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Scan failed');
      }

      const data = await res.json();
      setPages(data.pages || []);
      
      if (fileFormat === 'pdf') {
        setPdfName(`scan_${Date.now()}.pdf`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setScanning(false);
    }
  };

  const downloadScan = async (fileName: string) => {
    const a = document.createElement('a');
    a.href = `/api/file/${fileName}`;
    a.download = fileName;
    a.click();
  };

  const downloadAll = () => {
    pages.forEach((p, i) => {
      setTimeout(() => downloadScan(p), i * 500);
    });
  };

  const clearScan = () => {
    setPages([]);
  };

  const zoomIn = () => setZoomLevel(prev => Math.max(1, prev - 1));
  const zoomOut = () => setZoomLevel(prev => Math.min(8, prev + 1));

  return (
    <div className={styles.container}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>Scanner Bridge</div>

        <div className={styles.profileRow}>
          <span className={styles.profileLabel}>Profile:</span>
          <span className={styles.profileName}>{selectedScanner?.name || 'Default'}</span>
          <div className={styles.profileIcons}>
            <div className={styles.iconBtn} title="Edit profile">✎</div>
            <div className={styles.iconBtn} title="New profile">+</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Device</div>
          <div className={styles.deviceList}>
            {loading ? (
              <>
                <div className="shimmer" style={{ height: 54, margin: '8px 12px', borderRadius: 6 }}></div>
                <div className="shimmer" style={{ height: 54, margin: '8px 12px', borderRadius: 6 }}></div>
              </>
            ) : scanners.length === 0 ? (
              <div className={styles.noDevices}>No scanners found.</div>
            ) : (
              scanners.map((dev, i) => (
                <div 
                  key={i} 
                  className={`${styles.deviceCard} ${selectedScanner?.name === dev.name && selectedScanner?.driver === dev.driver ? styles.deviceCardSelected : ''}`}
                  onClick={() => setSelectedScanner(dev)}
                >
                  <div className={styles.deviceIcon}>🖨</div>
                  <div className={styles.deviceInfo}>
                    <div className={styles.deviceName}>{dev.name}</div>
                    <div className={styles.deviceSub}>
                      <span className={styles.driverBadge}>{dev.driver}</span>
                      NAPS2 Engine
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Settings</div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Paper source:</div>
            <select value={paperSource} onChange={(e) => setPaperSource(e.target.value)}>
              <option value="Feeder">Document Feeder (ADF)</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Duplex">Duplex</option>
            </select>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Page size:</div>
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
              <option value="A4">A4 (210×297 mm)</option>
              <option value="A3">A3 (297×420 mm)</option>
              <option value="Letter">Letter (8.5×11 in)</option>
              <option value="Legal">Legal (8.5×14 in)</option>
            </select>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Resolution:</div>
            <select value={dpi} onChange={(e) => setDpi(e.target.value)}>
              <option value="150">150 dpi — Draft</option>
              <option value="300">300 dpi — Standard</option>
              <option value="600">600 dpi — High Quality</option>
            </select>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Format & Color:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ flex: 2 }} value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
                <option value="Color">Color</option>
                <option value="Gray">Gray</option>
                <option value="BlackWhite">B&W</option>
              </select>
              <select style={{ flex: 1 }} value={fileFormat} onChange={(e) => setFileFormat(e.target.value)}>
                <option value="jpg">JPG</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          className={styles.scanBtn} 
          onClick={startScan} 
          disabled={!selectedScanner || scanning}
        >
          {scanning ? 'Scanning…' : selectedScanner ? 'Scan Document' : 'Select a device'}
        </button>

        <button 
          className={`${styles.refreshBtn} ${refreshing ? styles.spinning : ''}`}
          onClick={loadDevices}
        >
          <span>↺</span> Refresh Devices
        </button>

        <div className={styles.statusbar}>
          <div className={`${styles.sdot} ${styles[`sdot${status.type.charAt(0).toUpperCase() + status.type.slice(1)}`]}`}></div>
          <span>{status.text}</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={styles.previewArea}>
        <div className={styles.previewHeader}>
          <span className={styles.previewTitle}>Preview</span>
          
          {pages.length > 0 && (
            <div className={styles.zoomControls}>
              <button className={styles.zoomBtn} onClick={zoomOut} disabled={zoomLevel === 8} title="Zoom Out">➖</button>
              <span className={styles.zoomValue}>{zoomLevel} Columns</span>
              <button className={styles.zoomBtn} onClick={zoomIn} disabled={zoomLevel === 1} title="Zoom In">➕</button>
            </div>
          )}

          {pages.length > 0 && (
            <div className={styles.previewActions}>
              <button className={`${styles.actionBtn} ${styles.actionBtnDl}`} onClick={pages.length === 1 ? () => downloadScan(pages[0]) : downloadAll}>
                {pages.length === 1 ? '↓ Download' : `↓ Download (${pages.length})`}
              </button>
              <button className={styles.actionBtn} onClick={clearScan}>✕ Clear</button>
            </div>
          )}
        </div>

        <div className={styles.previewBox} style={{ justifyContent: pages.length > 0 ? 'start' : 'center' }}>
          {scanning ? (
            <div className={styles.scanningOverlay}>
              <div className={styles.scanAnim}>
                <div className={styles.scanLinesBg}></div>
                <div className={styles.scanLine}></div>
              </div>
              <div className={styles.scanningLabel}>Scanning document…</div>
              <div className={styles.scanningDevice}>{selectedScanner?.name}</div>
            </div>
          ) : pages.length > 0 ? (
            <div className={styles.gridContainer} style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}>
              {fileFormat === 'pdf' ? (
                <div className={styles.pdfPlaceholder} style={{ gridColumn: `span ${zoomLevel}` }}>
                  <div className={styles.pdfIcon}>📄</div>
                  <div className={styles.emptyTitle}>PDF Document Ready</div>
                  <div className={styles.emptySub}>{pdfName}</div>
                </div>
              ) : (
                pages.map((page, i) => (
                  <div key={i} className={styles.pageCard}>
                    <img src={`/api/file/${page}`} className={styles.pageImg} alt={`Page ${i+1}`} loading="lazy" />
                    <div className={styles.pageNumber}>#{i+1}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🖨</div>
              <div className={styles.emptyTitle}>No scan yet</div>
              <div className={styles.emptySub}>Select a device and press Scan</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
