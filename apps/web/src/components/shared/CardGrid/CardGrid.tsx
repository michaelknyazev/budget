import { Card } from '@blueprintjs/core';
import styles from './CardGrid.module.scss';

interface CardGridProps {
  children: React.ReactNode;
}

export function CardGrid({ children }: CardGridProps) {
  return <div className={styles.grid}>{children}</div>;
}

interface ItemCardProps {
  children: React.ReactNode;
  interactive?: boolean;
  onClick?: () => void;
}

export function ItemCard({ children, interactive, onClick }: ItemCardProps) {
  return (
    <Card className={styles.card} interactive={interactive} onClick={onClick}>
      {children}
    </Card>
  );
}

function ItemCardHeader({ children }: { children: React.ReactNode }) {
  return <div className={styles.cardHeader}>{children}</div>;
}

function ItemCardBody({ children }: { children: React.ReactNode }) {
  return <div className={styles.cardBody}>{children}</div>;
}

function ItemCardActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.cardActions}>{children}</div>;
}

ItemCard.Header = ItemCardHeader;
ItemCard.Body = ItemCardBody;
ItemCard.Actions = ItemCardActions;
