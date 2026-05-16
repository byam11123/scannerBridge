'use client';

import React from 'react';
import { Trash2, Info } from 'lucide-react';
import { ConfirmData } from '../../../types/scanner';
import styles from '../../ScannerBridge.module.css';

interface ConfirmModalProps {
  data: ConfirmData | null;
  onClose: () => void;
}

export default function ConfirmModal({ data, onClose }: ConfirmModalProps) {
  if (!data?.open) return null;

  return (
    <div className={styles.modal}>
      <div className={`${styles.modalContent} ${styles.confirmContent}`}>
        <div className={`${styles.confirmIcon} ${data.type === 'info' ? styles.alertIcon : ''}`}>
          {data.type === 'danger' ? <Trash2 size={28} /> : <Info size={28} />}
        </div>
        <div className={styles.confirmTitle}>{data.title}</div>
        <div className={styles.confirmMessage}>{data.message}</div>
        <div className={styles.modalFooter} style={{ justifyContent: 'center' }}>
          <button className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
          <button 
            className={styles.primaryBtn} 
            style={{ 
              background: data.type === 'danger' ? '#ef4444' : 'var(--primary)', 
              color: data.type === 'danger' ? 'white' : '#000' 
            }}
            onClick={data.onConfirm}
          >
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
