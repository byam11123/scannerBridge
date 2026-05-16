'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from '../ScannerBridge.module.css';

interface SetupSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalling: boolean;
  agentInstalled: boolean;
  setupStep: number;
  setAgentInstalled: (installed: boolean) => void;
  handleInstallAgent: () => void;
}

export default function SetupSidebar({
  isOpen,
  onClose,
  isInstalling,
  agentInstalled,
  setupStep,
  setAgentInstalled,
  handleInstallAgent
}: SetupSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modalOverlay} onClick={() => !isInstalling && onClose()} />
      <div className={styles.setupSidebar}>
        <div className={styles.setupHeader}>
          <div>
            <h3>Agent Setup</h3>
            <p>Bridge your browser to local hardware</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
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
            <button 
              className={styles.resetBtn} 
              onClick={() => { 
                setAgentInstalled(false); 
                localStorage.removeItem('scanner-bridge-installed'); 
              }}
            >
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
  );
}
