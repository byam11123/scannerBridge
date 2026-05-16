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
  RotateCcw,
  LayoutGrid,
  List,
  StopCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import styles from './ScannerBridge.module.css';

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
      {label && <div className={styles.fieldLabel}>{label}</div>}
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

import { useScannerLogic } from '../hooks/useScannerLogic';

export default function ScannerBridge() {
  const {
    scanners, selectedScanner, setSelectedScanner, loading, refreshing, scanning, status, refreshProgress, scanProgress,
    deviceViewMode, setDeviceViewMode, paperSource, setPaperSource, dpi, setDpi, colorMode, setColorMode,
    fileFormat, setFileFormat, pages, selectedPages, pageRotations, zoomLevel,
    ocrEnabled, setOcrEnabled, deskewEnabled, setDeskewEnabled, emailModal, setEmailModal, emailData, setEmailData,
    processing, saveMenuOpen, setSaveMenuOpen, pdfSettingsModal, setPdfSettingsModal, imageSettingsModal, setImageSettingsModal,
    pdfSettings, setPdfSettings, imageQuality, setImageQuality, confirmData, setConfirmData, alertData, setAlertData,
    saveMenuRef, previewBoxRef, agentInstalled, setAgentInstalled,
    setupOpen, setSetupOpen, setupStep, isInstalling, isMounted, loadDevices, rotateSelected,
    handleInstallAgent, startScan, cancelScan, handleImport, handleSave, togglePageSelection, deletePage, clearScan, rotatePage,
    theme, setTheme, zoomIn, zoomOut,
    isVercel, getApiUrl
  } = useScannerLogic();

  if (!isMounted) return null;


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

              {refreshing && refreshProgress > 0 && (
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

              <div className={styles.deviceListInner} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  scanners.length > 0 ? (
                    <CustomSelect 
                      label="Select Scanner" 
                      value={selectedScanner ? `${selectedScanner.name}|${selectedScanner.driver}` : ''} 
                      options={scanners.map(s => ({ value: `${s.name}|${s.driver}`, label: `${s.name} (${s.driver.toUpperCase()})` }))} 
                      onChange={(val) => {
                        const [name, driver] = val.split('|');
                        const s = scanners.find(dev => dev.name === name && dev.driver === driver);
                        if (s) setSelectedScanner(s);
                      }} 
                    />
                  ) : (
                    <div className={styles.deviceSub}>No scanners detected</div>
                  )
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
            <button className={styles.zoomBtn} onClick={zoomOut} title="Zoom Out"><ZoomOut size={14} /></button>
            <div className={styles.zoomLevel}>{zoomLevel}</div>
            <button className={styles.zoomBtn} onClick={zoomIn} title="Zoom In"><ZoomIn size={14} /></button>
          </div>

          <button className={`${styles.toolBtn} ${styles.toolBtnDanger}`} onClick={clearScan} disabled={pages.length === 0}>
            <Trash2 size={18} />
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 140 }}>
              <CustomSelect 
                label="" 
                value={theme} 
                options={[
                  { value: 'dark', label: 'Dark Theme' },
                  { value: 'light', label: 'Light Theme' },
                  { value: 'midnight', label: 'Midnight Blue' }
                ]} 
                onChange={setTheme} 
              />
            </div>
          </div>
        </div>

        <div className={styles.previewBox} ref={previewBoxRef}>
          {pages.length > 0 ? (
            <div className={styles.gridContainer} style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}>
              {pages.map((page, i) => (
                <div 
                  key={i} 
                  className={`${styles.pageCard} ${selectedPages.has(i) ? styles.pageCardSelected : ''}`}
                  onClick={() => togglePageSelection(i)}
                  style={{ aspectRatio: (pageRotations[i] || 0) % 180 !== 0 ? '1.414 / 1' : '1 / 1.414' }}
                >
                  <Image 
                    src={getApiUrl(`/api/file/${page}`)} 
                    alt={`Page ${i+1}`} 
                    width={400} 
                    height={600} 
                    className={styles.pageImage} 
                    style={{ 
                      transform: `rotate(${pageRotations[i] || 0}deg)`,
                      width: (pageRotations[i] || 0) % 180 !== 0 ? '70.71%' : '100%',
                      height: (pageRotations[i] || 0) % 180 !== 0 ? '141.42%' : '100%',
                    }}
                  />
                  <div className={styles.pageNumber}>Page {i+1}</div>
                  <div className={styles.pageOverlay}>
                    <button className={styles.pageActionBtn} onClick={(e) => { e.stopPropagation(); rotatePage(i, 'left'); }} title="Rotate Left"><RotateCcw size={18} /></button>
                    <button className={`${styles.pageActionBtn} ${styles.pageActionBtnDel}`} onClick={(e) => { e.stopPropagation(); deletePage(i); }} title="Delete Page"><Trash2 size={18} /></button>
                    <button className={styles.pageActionBtn} onClick={(e) => { e.stopPropagation(); rotatePage(i, 'right'); }} title="Rotate Right"><RotateCw size={18} /></button>
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

              {isVercel && (
                <div className={`${styles.setupInfo} ${styles.alertInfo}`} style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', gap: '8px', color: '#ef4444', marginBottom: '8px', alignItems: 'center' }}>
                    <AlertCircle size={16} />
                    <strong style={{ margin: 0 }}>Cloud Mode Detected</strong>
                  </div>
                  <p style={{ color: '#ef4444' }}>Scanner hardware is not accessible from the cloud. Please run this app locally at <strong>http://localhost:3000</strong> to use your scanner.</p>
                </div>
              )}

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
                  disabled={isInstalling || isVercel}
                  style={isVercel ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}}
                >
                  <Zap size={16} />
                  {isInstalling ? 'Installing Agent...' : isVercel ? 'Installation Disabled (Cloud)' : 'Authorize & Install Agent'}
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
              <div className={styles.progressBar} style={{ width: `${scanProgress}%` }}></div>
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
              <button className={styles.secondaryBtn} onClick={() => setConfirmData(null)}>{confirmData.cancelText || 'Cancel'}</button>
              <button 
                className={styles.primaryBtn} 
                style={{ background: confirmData.type === 'danger' ? '#ef4444' : 'var(--primary)', color: confirmData.type === 'danger' ? 'white' : '#000' }}
                onClick={confirmData.onConfirm}
              >
                {confirmData.confirmText || 'Confirm Action'}
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
