'use client';

import React from 'react';
import { Scan, X, StopCircle } from 'lucide-react';
import styles from '../ScannerBridge.module.css';

interface ScanningProgressProps {
  isScanning: boolean;
  scannerName: string | undefined;
  paperSource: string;
  cancelScan: () => void;
}

export default function ScanningProgress({
  isScanning,
  scannerName,
  paperSource,
  cancelScan
}: ScanningProgressProps) {
  if (!isScanning) return null;

  return (
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
          {scannerName}
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
  );
}
