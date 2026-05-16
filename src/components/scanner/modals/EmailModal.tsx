'use client';

import React from 'react';
import { X } from 'lucide-react';
import { EmailData } from '../../../types/scanner';
import styles from '../../ScannerBridge.module.css';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: EmailData;
  setEmailData: (data: EmailData) => void;
  processing: boolean;
  onSend: () => void;
}

export default function EmailModal({
  isOpen,
  onClose,
  emailData,
  setEmailData,
  processing,
  onSend
}: EmailModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <span>Email Document</span>
          <button className={styles.secondaryBtn} style={{ padding: 4 }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label>Recipient Address</label>
            <input 
              type="email" 
              value={emailData.to} 
              onChange={e => setEmailData({...emailData, to: e.target.value})} 
              placeholder="name@example.com" 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Subject Line</label>
            <input 
              type="text" 
              value={emailData.subject} 
              onChange={e => setEmailData({...emailData, subject: e.target.value})} 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Message Content</label>
            <textarea 
              rows={4} 
              value={emailData.body} 
              onChange={e => setEmailData({...emailData, body: e.target.value})} 
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={onSend} disabled={processing}>
            {processing ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
