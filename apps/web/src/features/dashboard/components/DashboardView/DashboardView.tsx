'use client';

import { useState } from 'react';
import {
  Card,
  H2,
  H4,
  Button,
  ButtonGroup,
  Spinner,
  Section,
  Intent,
} from '@blueprintjs/core';
import { useMonthlySummary } from '../../hooks/use-monthly-summary';
import styles from './DashboardView.module.scss';

export function DashboardView() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [currency, setCurrency] = useState('USD');

  const { data, isLoading } = useMonthlySummary(month, year, currency);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner size={50} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ButtonGroup>
          <Button icon="chevron-left" onClick={() => navigateMonth('prev')} />
          <Button minimal>
            {monthNames[month - 1]} {year}
          </Button>
          <Button icon="chevron-right" onClick={() => navigateMonth('next')} />
        </ButtonGroup>
      </div>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard} elevation={1}>
          <H4 className={styles.cardTitle}>Gross Income</H4>
          <H2 className={styles.cardAmount} style={{ color: 'var(--pt-intent-success-color)' }}>
            {data ? formatCurrency(data.grossIncome) : formatCurrency(0)}
          </H2>
        </Card>

        <Card className={styles.summaryCard} elevation={1}>
          <H4 className={styles.cardTitle}>Total Expenses</H4>
          <H2 className={styles.cardAmount} style={{ color: 'var(--pt-intent-danger-color)' }}>
            {data ? formatCurrency(data.totalExpenses) : formatCurrency(0)}
          </H2>
        </Card>

        <Card className={styles.summaryCard} elevation={1}>
          <H4 className={styles.cardTitle}>Loan Cost</H4>
          <H2 className={styles.cardAmount} style={{ color: 'var(--pt-intent-warning-color)' }}>
            {data ? formatCurrency(data.loanCost) : formatCurrency(0)}
          </H2>
        </Card>

        <Card className={styles.summaryCard} elevation={1}>
          <H4 className={styles.cardTitle}>Net Income</H4>
          <H2 className={styles.cardAmount} style={{ color: 'var(--pt-intent-primary-color)' }}>
            {data ? formatCurrency(data.netIncome) : formatCurrency(0)}
          </H2>
        </Card>
      </div>

      {data && data.topCategories.length > 0 && (
        <Section className={styles.categories} title="Top Categories" icon="tag">
          <div className={styles.categoryList}>
            {data.topCategories.map((category, index) => (
              <div key={index} className={styles.categoryItem}>
                <span className={styles.categoryName}>{category.name}</span>
                <span className={styles.categoryAmount}>{formatCurrency(category.amount)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
