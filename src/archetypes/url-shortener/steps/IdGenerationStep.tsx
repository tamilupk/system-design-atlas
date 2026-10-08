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
          A 7-character Base62 string provides 62<sup>7</sup> ≈ 3.52 trillion unique combinations, providing ample space, but still requiring collision detection. A low per-insert collision probability does not mean no collision over the service lifetime.
        </p>
      </div>

      <div className={styles.section}>
        <TradeoffTable
          title="ID Generation Strategies"
          items={[
            {
              aspect: 'Random Generation (e.g. 7 random chars)',
              pros: 'With a cryptographic random generator, removes obvious sequential enumeration; simple app-side generation',
              cons: 'Next-attempt collision probability rises with occupied keyspace; lifetime collisions require a unique index and retry loop'
            },
            {
              aspect: 'Sequential ID + Base62 Encoding',
              pros: 'Unique with a correctly coordinated allocator; numeric primary keys have good insertion locality',
              cons: 'Predictable codes expose enumeration; distributed allocation and code length need an explicit contract'
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
            Use INSERT ... ON CONFLICT DO NOTHING or roll back to a savepoint before retrying a fresh random code (up to 3 attempts). Catching a PostgreSQL error alone does not make an aborted transaction usable. Exhaustion returns a retryable failure under the same request key.
          </li>
          <li>
            <strong>2. Request Idempotency:</strong> If a client sends a create request and the network drops before receiving the 201 response, the client retries. 
            To prevent creating multiple duplicate short codes for the same request, clients include an <code className={styles.inlineCode}>Idempotency-Key</code> header. 
            The server atomically stores the request hash and result with the mapping. A code UNIQUE constraint alone does not deduplicate requests; the same destination may intentionally have several links.
          </li>
          <li>
            <strong>3. Custom-Alias Conflicts:</strong> When a user explicitly requests an alias like <code className={styles.inlineCode}>"my-link"</code>, any collision is <em>deterministic and intentional</em>. 
            The server must <strong>never</strong> silently retry with a random code; it must immediately return an HTTP <code className={styles.inlineCode}>409 Conflict</code> so the user can choose another alias.
          </li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Our choice at this scale</h3>
        <p className={styles.paragraph}>Use uniformly sampled cryptographic random seven-character Base62 codes and a unique-index retry loop. At 6B occupied codes, the next candidate collides with probability 6B / 62⁷ ≈ 0.17%; this is per attempt, not the chance of any collision ever. At roughly 40 creates/s average and 200/s peak, benchmark the random secondary index rather than introducing a cipher-based allocator to solve an unproven write bottleneck. A numeric primary key can still keep the main insertion key sequential.</p>
        <p className={styles.paragraph}>A permutation preserves uniqueness only over its defined input domain and with unique inputs; encoding the full 64-bit domain can require 11 Base62 characters. Randomizing the public code still randomizes its secondary index. Neither a short random code nor a home-grown Feistel construction substitutes for authorization. Keep claimed-code tombstones if codes must never be reassigned.</p>
      </div>

      <div className={styles.section}>
        <DecisionChallenge challenge={urlShortenerChallenges['id-generation-strategy']!} />
      </div>
    </div>
  );
};
