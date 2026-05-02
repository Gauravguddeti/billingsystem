export * from '../lib/schema';

// UI Specific Types
export interface NavItem {
  icon: string;
  label: string;
  href: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
