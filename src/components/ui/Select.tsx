import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  value: string;
  label: string;
  id: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  label,
  id,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <div className={styles.selectContainer}>
        <select
          id={id}
          value={value}
          onChange={onChange}
          className={styles.select}
          aria-label={label}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={styles.iconWrapper} aria-hidden="true">
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  );
};
