import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { CodeBlock } from '@/components/lesson/CodeBlock';
import styles from './StepContent.module.css';

export const ApiDataStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>API Endpoints</h3>
        <p className={styles.paragraph}>
          Our system needs two primary API endpoints: one for creating the short link, and one for redirecting the user when they click it.
        </p>
        
        <p className={styles.paragraph}>
          <strong>1. Create Short URL:</strong> The client sends the long URL and optional parameters (custom alias, expiration).
        </p>
        <CodeBlock
          language="json"
          code={`// POST /api/urls
// Request
{
  "long_url": "https://www.example.com/some/very/long/path/that/needs/shortening",
  "custom_alias": "my-link",
  "expires_at": "2025-12-31T23:59:59Z"
}

// Success Response (201 Created) - honors requested custom alias
{
  "short_code": "my-link",
  "short_url": "https://short.url/my-link",
  "created_at": "2024-03-10T10:00:00Z"
}

// Conflict Response (409 Conflict) - when custom alias is already claimed
{
  "error": "alias_already_taken",
  "message": "The custom alias 'my-link' is already in use. Please choose another alias."
}`}
        />

        <p className={styles.paragraph}>
          <strong>2. Redirect Endpoint:</strong> When a user navigates to the short URL, the server returns an HTTP redirect response with explicit caching directives.
        </p>
        <CodeBlock
          language="http"
          code={`// GET /:short_code (e.g., GET /my-link)

HTTP/1.1 302 Found
Location: https://www.example.com/some/very/long/path/that/needs/shortening
Cache-Control: private, max-age=90`}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Database Schema</h3>
        <p className={styles.paragraph}>
          For our relational database, we need a single table to store the mappings. We'll call this table <code className={styles.inlineCode}>urls</code>.
        </p>
        <CodeBlock
          language="sql"
          code={`CREATE TABLE urls (
  id BIGINT PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  click_count BIGINT DEFAULT 0
);`}
        />
        <p className={styles.paragraph}>
          Notice the <code className={styles.inlineCode}>UNIQUE</code> constraint on <code className={styles.inlineCode}>short_code</code>. 
          This constraint automatically creates a{' '}
          <button 
            className={styles.conceptLink} 
            onClick={() => onConceptClick('database-index')}
          >
            database index
          </button>, 
          which ensures that lookups by short code are fast (O(log n) time complexity) rather than requiring a full table scan.
        </p>
      </div>
    </div>
  );
};
