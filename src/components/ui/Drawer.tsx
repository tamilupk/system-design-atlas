import { useEffect, useRef, type ReactNode, type FC } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import styles from './Drawer.module.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
  noPadding?: boolean;
  hideHeader?: boolean;
  className?: string;
}

export const Drawer: FC<DrawerProps> = ({
  open,
  onClose,
  title,
  children,
  side = 'right',
  noPadding = false,
  hideHeader = false,
  className,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      drawerRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`${styles.portal} ${className || ''}`}>
      <div
        ref={overlayRef}
        className={`${styles.overlay} ${open ? styles.open : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${styles[side]} ${open ? styles.open : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {!hideHeader && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <IconButton
              icon={<X />}
              label="Close drawer"
              onClick={onClose}
              size="sm"
              className={styles.closeButton}
            />
          </div>
        )}
        <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>{children}</div>
      </div>
    </div>
  );
};
