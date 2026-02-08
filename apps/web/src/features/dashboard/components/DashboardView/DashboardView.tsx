'use client';

import { useState } from 'react';
import {
  Card,
  H4,
  HTMLTable,
  Button,
  ButtonGroup,
  Spinner,
  Section,
  Tag,
  Intent,
} from '@blueprintjs/core';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { useDisplayCurrency } from '@/contexts/DisplayCurrencyContext';
import { useMonthlySummary } from '../../hooks/use-monthly-summary';
import { useYearlySummary } from '@/features/reports/hooks/use-yearly-summary';
import styles from './DashboardView.module.scss';

const MONTH_NAMES = [
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

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function DashboardView() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { displayCurrency: currency } = useDisplayCurrency();
  const router = useRouter();

  const { data, isLoading } = useMonthlySummary(month, year, currency);
  const { data: yearlyData, isLoading: yearlyLoading } = useYearlySummary(
    year,
    currency,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const fmtCompact = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner size={50} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Dashboard"
        actions={
          <ButtonGroup>
            <Button icon="chevron-left" onClick={() => navigateMonth('prev')} />
            <Button minimal>
              {MONTH_NAMES[month - 1]} {year}
            </Button>
            <Button icon="chevron-right" onClick={() => navigateMonth('next')} />
          </ButtonGroup>
        }
      />

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard} elevation={0}>
          <H4 className={styles.cardLabel}>Gross Income</H4>
          <div className={`${styles.cardAmount} ${styles.income}`}>
            {data ? formatCurrency(data.grossIncome) : formatCurrency(0)}
          </div>
        </Card>

        <Card className={styles.summaryCard} elevation={0}>
          <H4 className={styles.cardLabel}>Total Expenses</H4>
          <div className={`${styles.cardAmount} ${styles.expense}`}>
            {data ? formatCurrency(data.totalExpenses) : formatCurrency(0)}
          </div>
        </Card>

        <Card className={styles.summaryCard} elevation={0}>
          <H4 className={styles.cardLabel}>Loan Cost</H4>
          <div className={`${styles.cardAmount} ${styles.loan}`}>
            {data ? formatCurrency(data.loanCost) : formatCurrency(0)}
          </div>
        </Card>

        <Card className={styles.summaryCard} elevation={0}>
          <H4 className={styles.cardLabel}>Net Income</H4>
          <div className={`${styles.cardAmount} ${styles.primary}`}>
            {data ? formatCurrency(data.netIncome) : formatCurrency(0)}
          </div>
        </Card>
      </div>

      {data && data.topCategories.length > 0 && (
        <Section className={styles.categories} title="Top Categories" icon="tag">
          <div className={styles.categoryList}>
            {data.topCategories.map((category, index) => (
              <div key={index} className={styles.categoryItem}>
                <span className={styles.categoryName}>{category.name}</span>
                <span className={styles.categoryAmount}>
                  {formatCurrency(category.amount)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Year at a Glance */}
      <Section
        title={`${year} at a Glance`}
        icon="calendar"
        rightElement={
          <Button
            minimal
            small
            icon="arrow-right"
            text="Full Report"
            onClick={() => router.push('/reports/yearly')}
          />
        }
      >
        {yearlyLoading ? (
          <Spinner size={30} />
        ) : yearlyData ? (
          <HTMLTable bordered striped interactive className={styles.yearlyTable}>
            <thead>
              <tr>
                <th>Month</th>
                <th className={styles.alignRight}>Income</th>
                <th className={styles.alignRight}>Expenses</th>
                <th className={styles.alignRight}>Net</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.months.map((m, idx) => {
                const isCurrentMonth =
                  year === now.getFullYear() && idx === now.getMonth();
                const hasData =
                  m.grossIncome > 0 || m.totalExpenses > 0 || m.loanCost > 0;

                return (
                  <tr
                    key={m.month}
                    className={isCurrentMonth ? styles.currentMonth : ''}
                    onClick={() =>
                      router.push(`/reports/monthly?month=${m.month}&year=${year}`)
                    }
                  >
                    <td>
                      {MONTH_SHORT[idx]}
                      {isCurrentMonth && (
                        <Tag
                          minimal
                          intent={Intent.PRIMARY}
                          className={styles.currentTag}
                        >
                          Now
                        </Tag>
                      )}
                    </td>
                    <td className={`${styles.alignRight} ${styles.incomeText}`}>
                      {hasData ? fmtCompact(m.grossIncome) : '-'}
                    </td>
                    <td className={`${styles.alignRight} ${styles.expenseText}`}>
                      {hasData ? fmtCompact(m.totalExpenses) : '-'}
                    </td>
                    <td
                      className={`${styles.alignRight} ${
                        m.netIncome >= 0
                          ? styles.incomeText
                          : styles.expenseText
                      }`}
                    >
                      {hasData ? fmtCompact(m.netIncome) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td>
                  <strong>Total</strong>
                </td>
                <td className={`${styles.alignRight} ${styles.incomeText}`}>
                  <strong>
                    {fmtCompact(yearlyData.totals.grossIncome)}
                  </strong>
                </td>
                <td className={`${styles.alignRight} ${styles.expenseText}`}>
                  <strong>
                    {fmtCompact(yearlyData.totals.totalExpenses)}
                  </strong>
                </td>
                <td
                  className={`${styles.alignRight} ${
                    yearlyData.totals.netIncome >= 0
                      ? styles.incomeText
                      : styles.expenseText
                  }`}
                >
                  <strong>{fmtCompact(yearlyData.totals.netIncome)}</strong>
                </td>
              </tr>
            </tfoot>
          </HTMLTable>
        ) : null}
      </Section>
    </div>
  );
}
