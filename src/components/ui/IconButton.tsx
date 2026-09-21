import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', icon, label, variant = 'ghost', size = 'md', disabled, ...props }, ref) => {
    const classNames = [
      styles.iconButton,
      styles[variant],
      styles[size],
      className,
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={classNames}
        aria-label={label}
        disabled={disabled}
        title={label}
        {...props}
      >
        <span className={styles.iconWrapper}>{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
