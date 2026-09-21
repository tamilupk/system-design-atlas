import type { FC } from 'react';
import styles from './TradeoffTable.module.css';

interface TradeoffTableProps {
  items: readonly { aspect: string; pros: string; cons: string }[];
  title?: string;
}

export const TradeoffTable: FC<TradeoffTableProps> = ({ items, title }) => {
  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Aspect</th>
              <th scope="col">Pros</th>
              <th scope="col">Cons</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className={styles.aspectCol}>{item.aspect}</td>
                <td className={styles.prosCol}>{item.pros}</td>
                <td className={styles.consCol}>{item.cons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
