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
import { PageHeader } from '@/components/shared/PageHeader';
import { useDisplayCurrency } from '@/contexts/DisplayCurrencyContext';
import { useYearlySummary } from '../../hooks/use-yearly-summary';
import styles from './YearlyOverviewView.module.scss';

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

const CURRENCIES = ['USD', 'GEL', 'RUB', 'EUR', 'GBP'] as const;

export function YearlyOverviewView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const { displayCurrency: currency } = useDisplayCurrency();

  const { data, isLoading } = useYearlySummary(year, currency);

  const currentMonth = now.getMonth(); // 0-based

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const fmtOriginal = (amount: number, cur: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

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
        title="Yearly Overview"
        actions={
          <ButtonGroup>
            <Button icon="chevron-left" onClick={() => setYear(year - 1)} />
            <Button minimal>{year}</Button>
            <Button icon="chevron-right" onClick={() => setYear(year + 1)} />
          </ButtonGroup>
        }
      />

      {data && (
        <>
          {/* Summary Totals */}
          <div className={styles.summaryGrid}>
            <Card className={styles.summaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Total Gross Income</H4>
              <div className={`${styles.cardAmount} ${styles.income}`}>
                {fmt(data.totals.grossIncome)}
              </div>
            </Card>

            <Card className={styles.summaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Total Expenses</H4>
              <div className={`${styles.cardAmount} ${styles.expense}`}>
                {fmt(data.totals.totalExpenses)}
              </div>
            </Card>

            <Card className={styles.summaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Total Loan Cost</H4>
              <div className={`${styles.cardAmount} ${styles.loan}`}>
                {fmt(data.totals.loanCost)}
              </div>
            </Card>

            <Card className={styles.summaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Total Net Income</H4>
              <div className={`${styles.cardAmount} ${styles.primary}`}>
                {fmt(data.totals.netIncome)}
              </div>
            </Card>
          </div>

          {/* Monthly Breakdown Table — Planned vs Actual */}
          <Section title="Monthly Breakdown — Planned vs Actual" icon="calendar">
            {data.startingBalance !== 0 && (
              <div className={styles.baselineRow}>
                <Tag minimal icon="bank-account" large>
                  Starting Balance (prior years + account balances):{' '}
                  <strong>{fmt(data.startingBalance)}</strong>
                </Tag>
              </div>
            )}
            <div className={styles.tableScroll}>
              <HTMLTable bordered striped className={styles.fullTable}>
                <thead>
                  <tr>
                    <th rowSpan={2}>Month</th>
                    <th colSpan={2} className={styles.groupHeader}>Income</th>
                    <th colSpan={2} className={styles.groupHeader}>Expenses</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`} rowSpan={2}>Loan Cost</th>
                    <th colSpan={2} className={styles.groupHeader}>Net Income</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`} rowSpan={2}>Cumulative Savings</th>
                  </tr>
                  <tr>
                    <th className={`${styles.alignRight} ${styles.subHeader}`}>Plan</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`}>Actual</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`}>Plan</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`}>Actual</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`}>Plan</th>
                    <th className={`${styles.alignRight} ${styles.subHeader}`}>Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m, idx) => {
                    const isCurrentMonth =
                      year === now.getFullYear() && idx === currentMonth;
                    return (
                      <tr
                        key={m.month}
                        className={isCurrentMonth ? styles.currentMonth : ''}
                      >
                        <td>
                          {MONTH_NAMES[idx]}
                          {isCurrentMonth && (
                            <Tag
                              minimal
                              intent={Intent.PRIMARY}
                              className={styles.currentTag}
                            >
                              Current
                            </Tag>
                          )}
                        </td>
                        {/* Income: Planned / Actual */}
                        <td className={`${styles.alignRight} ${styles.income} ${styles.plannedText}`}>
                          {m.plannedIncome > 0 ? fmt(m.plannedIncome) : '-'}
                        </td>
                        <td className={`${styles.alignRight} ${styles.income}`}>
                          {fmt(m.grossIncome)}
                        </td>
                        {/* Expenses: Planned / Actual */}
                        <td className={`${styles.alignRight} ${styles.expense} ${styles.plannedText}`}>
                          {m.plannedExpenses > 0 ? fmt(m.plannedExpenses) : '-'}
                        </td>
                        <td className={`${styles.alignRight} ${styles.expense}`}>
                          {fmt(m.totalExpenses)}
                        </td>
                        {/* Loan Cost */}
                        <td className={`${styles.alignRight} ${styles.loan}`}>
                          {fmt(m.loanCost)}
                        </td>
                        {/* Net Income: Planned / Actual */}
                        <td
                          className={`${styles.alignRight} ${styles.plannedText} ${
                            m.plannedNetIncome >= 0 ? styles.income : styles.expense
                          }`}
                        >
                          {m.plannedIncome > 0 || m.plannedExpenses > 0
                            ? fmt(m.plannedNetIncome)
                            : '-'}
                        </td>
                        <td
                          className={`${styles.alignRight} ${
                            m.netIncome >= 0 ? styles.income : styles.expense
                          }`}
                        >
                          {fmt(m.netIncome)}
                        </td>
                        {/* Cumulative Savings */}
                        <td className={styles.alignRight}>
                          {fmt(data.cumulativeSavings[idx] ?? 0)}
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
                    <td className={`${styles.alignRight} ${styles.income} ${styles.plannedText}`}>
                      <strong>{fmt(data.totals.plannedIncome)}</strong>
                    </td>
                    <td className={`${styles.alignRight} ${styles.income}`}>
                      <strong>{fmt(data.totals.grossIncome)}</strong>
                    </td>
                    <td className={`${styles.alignRight} ${styles.expense} ${styles.plannedText}`}>
                      <strong>{fmt(data.totals.plannedExpenses)}</strong>
                    </td>
                    <td className={`${styles.alignRight} ${styles.expense}`}>
                      <strong>{fmt(data.totals.totalExpenses)}</strong>
                    </td>
                    <td className={`${styles.alignRight} ${styles.loan}`}>
                      <strong>{fmt(data.totals.loanCost)}</strong>
                    </td>
                    <td
                      className={`${styles.alignRight} ${styles.plannedText} ${
                        data.totals.plannedNetIncome >= 0 ? styles.income : styles.expense
                      }`}
                    >
                      <strong>{fmt(data.totals.plannedNetIncome)}</strong>
                    </td>
                    <td
                      className={`${styles.alignRight} ${
                        data.totals.netIncome >= 0 ? styles.income : styles.expense
                      }`}
                    >
                      <strong>{fmt(data.totals.netIncome)}</strong>
                    </td>
                    <td className={styles.alignRight}>
                      <strong>
                        {fmt(data.cumulativeSavings[11] ?? 0)}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </HTMLTable>
            </div>
          </Section>

          {/* Expenses by Currency Table */}
          <Section title="Expenses by Original Currency" icon="exchange">
            <HTMLTable bordered striped className={styles.fullTable}>
              <thead>
                <tr>
                  <th>Month</th>
                  {CURRENCIES.map((cur) => (
                    <th key={cur} className={styles.alignRight}>
                      {cur}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.months.map((m, idx) => {
                  const isCurrentMonth =
                    year === now.getFullYear() && idx === currentMonth;
                  return (
                    <tr
                      key={m.month}
                      className={isCurrentMonth ? styles.currentMonth : ''}
                    >
                      <td>{MONTH_NAMES[idx]}</td>
                      {CURRENCIES.map((cur) => {
                        const val =
                          (m.expensesByCurrency as Record<string, number>)[
                            cur
                          ] ?? 0;
                        return (
                          <td key={cur} className={styles.alignRight}>
                            {val > 0 ? fmtOriginal(val, cur) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td>
                    <strong>Total</strong>
                  </td>
                  {CURRENCIES.map((cur) => {
                    const total = data.months.reduce(
                      (sum, m) =>
                        sum +
                        ((m.expensesByCurrency as Record<string, number>)[
                          cur
                        ] ?? 0),
                      0,
                    );
                    return (
                      <td key={cur} className={styles.alignRight}>
                        <strong>
                          {total > 0 ? fmtOriginal(total, cur) : '-'}
                        </strong>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </HTMLTable>
          </Section>
        </>
      )}
    </div>
  );
}
