import React from 'react';
import styles from './LessonNavigation.module.css';
import { ChevronRight, Home } from 'lucide-react';

interface LessonNavigationProps {
  chapterTitle: string;
  stepTitle: string;
}

export const LessonNavigation: React.FC<LessonNavigationProps> = ({
  chapterTitle,
  stepTitle
}) => {
  return (
    <nav className={styles.nav} aria-label="Breadcrumb">
      <ol className={styles.breadcrumb}>
        <li>
          <a href="#/" className={styles.link} aria-label="Home">
            <Home size={16} />
          </a>
        </li>
        <li className={styles.separator}><ChevronRight size={16} /></li>
        <li>
          <a href="#/" className={styles.link}>{chapterTitle}</a>
        </li>
        <li className={styles.separator}><ChevronRight size={16} /></li>
        <li className={styles.current} aria-current="page">
          {stepTitle}
        </li>
      </ol>
    </nav>
  );
};
