import React, { useState } from 'react';
import styles from './CodeBlock.module.css';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className={styles.container}>
      {(title || language) && (
        <div className={styles.header}>
          <div className={styles.meta}>
            {language && <span className={styles.language}>{language}</span>}
            {title && <span className={styles.title}>{title}</span>}
          </div>
          <button 
            className={styles.copyButton} 
            onClick={handleCopy}
            aria-label="Copy code"
            title="Copy code"
          >
            {copied ? <Check size={16} className={styles.successIcon} /> : <Copy size={16} />}
          </button>
        </div>
      )}
      {!title && !language && (
        <button 
          className={`${styles.copyButton} ${styles.floatingCopy}`} 
          onClick={handleCopy}
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? <Check size={16} className={styles.successIcon} /> : <Copy size={16} />}
        </button>
      )}
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  );
};
