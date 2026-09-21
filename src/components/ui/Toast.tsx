import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { IconButton } from './IconButton';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className={styles.toastContainer} aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastProps {
  toast: ToastMessage;
  onRemove: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert">
      <div className={styles.iconWrapper}>
        <Icon size={20} />
      </div>
      <div className={styles.message}>{toast.message}</div>
      <IconButton
        icon={<X />}
        label="Close toast"
        onClick={onRemove}
        size="sm"
        variant="ghost"
        className={styles.closeButton}
      />
    </div>
  );
};
