import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { TradeoffTable } from '@/components/lesson/TradeoffTable';
import { CodeBlock } from '@/components/lesson/CodeBlock';
import styles from './StepContent.module.css';

export const IdGenerationStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Generating the Short Code</h3>
        <p className={styles.paragraph}>
          The core technical challenge of a URL shortener is reliably generating unique, short strings. 
          The most common character set used is Base62 (A-Z, a-z, 0-9), giving us 62 characters to work with.
          A 7-character Base62 string allows for 62<sup>7</sup> ≈ 3.5 trillion combinations.
        </p>
        <p className={styles.paragraph}>
          There are two primary approaches to generating these IDs:
        </p>
      </div>

      <div className={styles.section}>
        <TradeoffTable
          title="ID Generation Strategies"
          items={[
            {
              aspect: 'Random Generation',
              pros: 'Unpredictable codes (harder to scrape); simple to implement without extra infrastructure',
              cons: 'Collision probability increases over time; requires retry logic on unique constraint violation'
            },
            {
              aspect: 'Sequential ID Encoding',
              pros: 'Zero collisions by design; deterministic and highly performant',
              cons: 'Predictable and enumerable codes; requires centralized counter or distributed ID generator'
            }
          ]}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>How Base62 Encoding Works</h3>
        <p className={styles.paragraph}>
          If we use the Sequential ID approach (e.g., an auto-incrementing database ID or a distributed Snowflake ID), 
          we simply convert that base-10 number into a base-62 string.
        </p>
        <CodeBlock
          language="text"
          code={`ID 125      -> Base62 "2B"
ID 1000000  -> Base62 "4C92"
ID 35000000 -> Base62 "2fXb8"`}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Handling Random Collisions</h3>
        <p className={styles.paragraph}>
          If we choose Random Generation, we must handle the rare chance that we generate a code that already exists. 
          When we attempt to insert into the database, the unique index will throw an error. 
          We handle this by catching the error and retrying with a new code—a pattern closely related to{' '}
          <button 
            className={styles.conceptLink} 
            onClick={() => onConceptClick('idempotency')}
          >
            idempotency
          </button> in distributed systems.
        </p>
      </div>
    </div>
  );
};
