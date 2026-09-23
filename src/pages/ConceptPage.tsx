import { useParams, Link } from 'react-router-dom';
import { getConcept } from '@/concepts/registry';
import { useEffect, useState } from 'react';
import { archetypeCatalog } from '@/archetypes/catalog';
import { archetypeRegistry } from '@/archetypes/registry';
import { buildConceptIndex } from '@/archetypes/concept-index';
import { TradeoffTable } from '@/components/lesson/TradeoffTable';
import { AskAIButton } from '@/components/chat/AskAIButton';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import styles from './ConceptPage.module.css';

export function ConceptPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const concept = conceptId ? getConcept(conceptId) : undefined;

  const [contexts, setContexts] = useState<ReturnType<typeof buildConceptIndex>>(new Map());
  const [contextError, setContextError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all(archetypeCatalog.filter(entry => entry.availability === 'available').map(async entry => {
      const loader = archetypeRegistry[entry.id];
      if (!loader) throw new Error(`Missing chapter: ${entry.id}`);
      return loader();
    })).then(chapters => {
      if (active) setContexts(buildConceptIndex(chapters));
    }).catch(() => { if (active) setContextError(true); });
    return () => { active = false; };
  }, []);

  if (!concept) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={`${styles.card} ${styles.emptyCard}`}>
            <h2>Concept Not Found</h2>
            <p>The architectural concept you requested could not be found.</p>
            <Link to="/" className={styles.relatedBadge}>
              <ArrowLeft size={16} /> Return to Curriculum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const appliedIn = contexts.get(concept.id) ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link to="/" className={styles.breadcrumbLink}>Atlas</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>Concepts</span>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span aria-current="page">{concept.title}</span>
        </nav>

        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.titleGroup}>
              <span className={styles.badge}>System Architecture Concept</span>
              <h1 className={styles.title}>{concept.title}</h1>
            </div>
            <AskAIButton
              chapterTitle="System Design Atlas Core Concepts"
              stepTitle={concept.title}
              stepObjective={concept.summary}
              designSummary={concept.explanation}
              conceptTitle={concept.title}
              conceptContext={concept.role}
            />
          </div>
          <p className={styles.summary}>{concept.summary}</p>
        </header>

        <section className={styles.card} aria-labelledby="role-heading">
          <h2 id="role-heading" className={styles.sectionTitle}>Architectural Role</h2>
          <p className={styles.paragraph}>{concept.role}</p>
        </section>

        <section className={styles.card} aria-labelledby="explanation-heading">
          <h2 id="explanation-heading" className={styles.sectionTitle}>Deep Technical Explanation</h2>
          <p className={styles.paragraph}>{concept.explanation}</p>
        </section>

        {concept.tradeoffs.length > 0 && (
          <section className={styles.card} aria-labelledby="tradeoffs-heading">
            <h2 id="tradeoffs-heading" className={styles.sectionTitle}>Key Trade-offs</h2>
            <TradeoffTable items={concept.tradeoffs} />
          </section>
        )}

        {concept.failureModes.length > 0 && (
          <section className={styles.card} aria-labelledby="failure-modes-heading">
            <h2 id="failure-modes-heading" className={styles.sectionTitle}>Failure Modes & Edge Cases</h2>
            <ul className={styles.list}>
              {concept.failureModes.map((failure, idx) => (
                <li key={idx}>{failure}</li>
              ))}
            </ul>
          </section>
        )}

        {contextError && <p role="status">Case studies could not be loaded. Reload to try again.</p>}
        {appliedIn.length > 0 && (
          <section className={styles.card} aria-labelledby="archetypes-heading">
            <h2 id="archetypes-heading" className={styles.sectionTitle}>Applied in System Archetypes</h2>
            {appliedIn.map(({ metadata, entry }) => (<div key={metadata.id} className={styles.archetypeCard}>
              <Link to={`/archetypes/${metadata.id}`} className={styles.archetypeTitle}>
                {metadata.title} Case Study <ExternalLink size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
              </Link>
              <p className={styles.archetypeRole}>{entry.chapterRole}</p>
              {entry.specificConsiderations.length > 0 && (
                <ul className={styles.list} style={{ marginTop: 8 }}>
                  {entry.specificConsiderations.map((consideration, idx) => (
                    <li key={idx}>{consideration}</li>
                  ))}
                </ul>
              )}
            </div>))}
          </section>
        )}

        {concept.relatedConceptIds && concept.relatedConceptIds.length > 0 && (
          <section className={styles.card} aria-labelledby="related-heading">
            <h2 id="related-heading" className={styles.sectionTitle}>Related Architectural Concepts</h2>
            <div className={styles.relatedList}>
              {concept.relatedConceptIds.map(relatedId => {
                const related = getConcept(relatedId);
                if (!related) return null;
                return (
                  <Link key={related.id} to={`/concepts/${related.id}`} className={styles.relatedBadge}>
                    {related.title}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
