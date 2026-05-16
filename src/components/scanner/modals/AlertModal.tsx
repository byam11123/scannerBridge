'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { AlertData } from '../../../types/scanner';
import styles from '../../ScannerBridge.module.css';

interface AlertModalProps {
  data: AlertData | null;
  onClose: () => void;
}

export default function AlertModal({ data, onClose }: AlertModalProps) {
  if (!data?.open) return null;

  return (
    <div className={styles.modal}>
      <div className={`${styles.modalContent} ${styles.confirmContent}`}>
        <div 
          className={`${styles.confirmIcon} ${data.type === 'success' ? styles.sdotGreen : styles.confirmIcon}`} 
          style={{ background: data.type === 'success' ? '#10b9811a' : '#ef44441a' }}
        >
          {data.type === 'success' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
        </div>
        <div className={styles.confirmTitle}>{data.title}</div>
        <div className={styles.confirmMessage}>{data.message}</div>
        <div className={styles.modalFooter} style={{ justifyContent: 'center' }}>
          <button className={styles.primaryBtn} onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
