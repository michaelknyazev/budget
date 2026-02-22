import { Card, H4 } from '@blueprintjs/core';
import styles from './SummaryCard.module.scss';

export type SummaryCardIntent = 'income' | 'expense' | 'loan' | 'primary' | 'warning';

interface SummaryCardGridProps {
  children: React.ReactNode;
}

export function SummaryCardGrid({ children }: SummaryCardGridProps) {
  return <div className={styles.grid}>{children}</div>;
}

interface SummaryCardProps {
  label: string;
  amount: string;
  intent?: SummaryCardIntent;
  interactive?: boolean;
  onClick?: () => void;
}

export function SummaryCard({
  label,
  amount,
  intent = 'primary',
  interactive,
  onClick,
}: SummaryCardProps) {
  return (
    <Card
      className={styles.card}
      elevation={1}
      interactive={interactive}
      onClick={onClick}
    >
      <H4 className={styles.label}>{label}</H4>
      <div className={`${styles.amount} ${styles[intent]}`}>{amount}</div>
    </Card>
  );
}
