import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { TradeoffTable } from '@/components/lesson/TradeoffTable';
import { CodeBlock } from '@/components/lesson/CodeBlock';
import { DecisionChallenge } from '@/components/challenge/DecisionChallenge';
import { urlShortenerChallenges } from '../challenges';
import styles from './StepContent.module.css';

export const IdGenerationStep: FC<StepComponentProps> = () => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Generating the Short Code</h3>
        <p className={styles.paragraph}>
          The core technical challenge of a URL shortener is reliably generating unique, compact strings.
          The standard Base62 alphabet is <code className={styles.inlineCode}>0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz</code> (digits 0–9, uppercase A–Z, lowercase a–z).
          A 7-character Base62 string provides 62<sup>7</sup> ≈ 3.52 trillion unique combinations, accommodating billions of URLs with negligible collision risk.
        </p>
      </div>

      <div className={styles.section}>
        <TradeoffTable
          title="ID Generation Strategies"
          items={[
            {
              aspect: 'Random Generation (e.g. 7 random chars)',
              pros: 'Unpredictable and un-enumerable (resists link enumeration attacks); stateless generation on app servers',
              cons: 'Collision rate rises as keyspace fills (Birthday paradox); requires unique index & retry loop on insert'
            },
            {
              aspect: 'Sequential ID + Base62 Encoding',
              pros: 'Zero collisions by design; strictly deterministic; optimal B-Tree index insertion locality',
              cons: 'Predictable sequence allows competitor scraping; requires centralized range server or 64-bit Snowflake IDs'
            }
          ]}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Tested Base62 Encoding</h3>
        <p className={styles.paragraph}>
          When converting 64-bit integer IDs (from a database sequence, counter range, or Snowflake generator) into Base62 using the standard alphabet:
        </p>
        <CodeBlock
          language="text"
          code={`Alphabet: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz

ID 125        -> Base62 "21"     (125 = 2 × 62 + 1)
ID 1,000,000   -> Base62 "4C92"   (4 × 62³ + 12 × 62² + 9 × 62 + 2)
ID 35,000,000  -> Base62 "2Mr68"  (2 × 62⁴ + 22 × 62³ + 53 × 62² + 6 × 62 + 8)`}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Separating Collisions, Idempotency, and Conflicts</h3>
        <p className={styles.paragraph}>
          Senior system design requires distinguishing three distinct collision scenarios that junior engineers often conflate:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>1. Random Code Collisions:</strong> Occur when the random generator picks an already-used string. 
            Because the database enforces a <code className={styles.inlineCode}>UNIQUE</code> constraint on <code className={styles.inlineCode}>short_code</code>, the insert aborts. 
            The app server catches this constraint violation and immediately retries with a fresh random code (up to 3 attempts).
          </li>
          <li>
            <strong>2. Request Idempotency:</strong> If a client sends a create request and the network drops before receiving the 201 response, the client retries. 
            To prevent creating multiple duplicate short codes for the same request, clients include an <code className={styles.inlineCode}>Idempotency-Key</code> header. 
            The server checks an idempotency store to return the previously created record.
          </li>
          <li>
            <strong>3. Custom-Alias Conflicts:</strong> When a user explicitly requests an alias like <code className={styles.inlineCode}>"my-link"</code>, any collision is <em>deterministic and intentional</em>. 
            The server must <strong>never</strong> silently retry with a random code; it must immediately return an HTTP <code className={styles.inlineCode}>409 Conflict</code> so the user can choose another alias.
          </li>
        </ul>
      </div>

      <div className={styles.section}>
        <DecisionChallenge challenge={urlShortenerChallenges['id-generation-strategy']!} />
      </div>
    </div>
  );
};
