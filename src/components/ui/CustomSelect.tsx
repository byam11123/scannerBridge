'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from '../ScannerBridge.module.css';

interface CustomSelectProps {
  label: string;
  value: string;
  options: { value: string, label: string }[];
  onChange: (val: string) => void;
}

export default function CustomSelect({ label, value, options, onChange }: CustomSelectProps) {
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
      <div className={styles.fieldLabel}>{label}</div>
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
