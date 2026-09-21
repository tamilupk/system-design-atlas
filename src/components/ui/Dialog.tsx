import { useEffect, useRef, type ReactNode, type FC } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Dialog: FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    if (open) {
      if (!dialogNode.open) {
        dialogNode.showModal();
      }
    } else {
      if (dialogNode.open) {
        dialogNode.close();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    const handleClick = (event: MouseEvent) => {
      const rect = dialogNode.getBoundingClientRect();
      const isInDialog =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        onClose();
      }
    };

    dialogNode.addEventListener('cancel', handleCancel);
    dialogNode.addEventListener('click', handleClick);

    return () => {
      dialogNode.removeEventListener('cancel', handleCancel);
      dialogNode.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className={`${styles.dialog} ${styles[size]}`} aria-label={title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <IconButton
          icon={<X />}
          label="Close dialog"
          onClick={onClose}
          size="sm"
          className={styles.closeButton}
        />
      </div>
      <div className={styles.content}>{children}</div>
    </dialog>
  );
};
