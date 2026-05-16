'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import styles from '../ScannerBridge.module.css';

interface PageCardProps {
  page: string;
  index: number;
  isSelected: boolean;
  rotation: number;
  toggleSelection: (index: number) => void;
  movePage: (index: number, direction: 'left' | 'right') => void;
  deletePage: (index: number) => void;
}

export default function PageCard({
  page,
  index,
  isSelected,
  rotation,
  toggleSelection,
  movePage,
  deletePage
}: PageCardProps) {
  return (
    <div 
      className={`${styles.pageCard} ${isSelected ? styles.pageCardSelected : ''}`}
      onClick={() => toggleSelection(index)}
    >
      <Image 
        src={page} 
        alt={`Page ${index + 1}`} 
        width={400} 
        height={600} 
        className={styles.pageImage} 
        style={{ transform: `rotate(${rotation || 0}deg)` }}
      />
      <div className={styles.pageNumber}>Page {index + 1}</div>
      <div className={styles.pageOverlay}>
        <button 
          className={styles.pageActionBtn} 
          onClick={(e) => { e.stopPropagation(); movePage(index, 'left'); }}
        >
          <ChevronLeft size={18} />
        </button>
        <button 
          className={`${styles.pageActionBtn} ${styles.pageActionBtnDel}`} 
          onClick={(e) => { e.stopPropagation(); deletePage(index); }}
        >
          <Trash2 size={18} />
        </button>
        <button 
          className={styles.pageActionBtn} 
          onClick={(e) => { e.stopPropagation(); movePage(index, 'right'); }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
