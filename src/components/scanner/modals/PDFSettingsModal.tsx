'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PDFSettings } from '../../../types/scanner';
import styles from '../../ScannerBridge.module.css';

interface PDFSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfSettings: PDFSettings;
  setPdfSettings: (settings: PDFSettings) => void;
}

export default function PDFSettingsModal({
  isOpen,
  onClose,
  pdfSettings,
  setPdfSettings
}: PDFSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <span>PDF Document Settings</span>
          <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label>Document Title</label>
              <input 
                type="text" 
                value={pdfSettings.title} 
                onChange={e => setPdfSettings({...pdfSettings, title: e.target.value})} 
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Author</label>
              <input 
                type="text" 
                value={pdfSettings.author} 
                onChange={e => setPdfSettings({...pdfSettings, author: e.target.value})} 
              />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Subject</label>
            <input 
              type="text" 
              value={pdfSettings.subject} 
              onChange={e => setPdfSettings({...pdfSettings, subject: e.target.value})} 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Keywords</label>
            <input 
              type="text" 
              value={pdfSettings.keywords} 
              onChange={e => setPdfSettings({...pdfSettings, keywords: e.target.value})} 
              placeholder="scanned, document, etc." 
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.primaryBtn} onClick={onClose}>Apply Settings</button>
        </div>
      </div>
    </div>
  );
}
