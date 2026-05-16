export interface Scanner {
  name: string;
  driver: string;
}

export interface Status {
  type: string;
  text: string;
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
}

export interface PDFSettings {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export interface ConfirmData {
  open: boolean;
  title: string;
  message: string;
  type: 'danger' | 'info';
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertData {
  open: boolean;
  title: string;
  message: string;
  type: 'error' | 'success';
}
