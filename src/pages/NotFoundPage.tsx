import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>404 - Page Not Found</h1>
        <p className={styles.message}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')} variant="primary">
          Return Home
        </Button>
      </div>
    </div>
  );
}
