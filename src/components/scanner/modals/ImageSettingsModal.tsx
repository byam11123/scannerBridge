'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from '../../ScannerBridge.module.css';

interface ImageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageQuality: number;
  setImageQuality: (quality: number) => void;
}

export default function ImageSettingsModal({
  isOpen,
  onClose,
  imageQuality,
  setImageQuality
}: ImageSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <span>JPEG Image Settings</span>
          <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={onClose}>
            <X size={18} />
          </button>
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
          <button className={styles.primaryBtn} onClick={onClose}>Apply Settings</button>
        </div>
      </div>
    </div>
  );
}
