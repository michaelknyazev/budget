'use client';

import { useState } from 'react';
import {
  H5,
  HTMLTable,
  Button,
  ButtonGroup,
  Spinner,
  Section,
  Tag,
  Intent,
  Icon,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { SummaryCard, SummaryCardGrid } from '@/components/shared/SummaryCard';
import { CategoryPieChart } from '@/components/shared/Charts';
import { useDisplayCurrency } from '@/contexts/DisplayCurrencyContext';
import { useMonthlyReport } from '../../hooks/use-monthly-report';
import styles from './MonthlyReportView.module.scss';

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

export function MonthlyReportView() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { displayCurrency: currency } = useDisplayCurrency();

  const { data, isLoading } = useMonthlyReport(month, year, currency);

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const fmtAny = (amount: number, cur: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

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
        title="Monthly Report"
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

      {data && (
        <>
          <SummaryCardGrid>
            <SummaryCard label="Gross Income" amount={fmt(data.summary.grossIncome)} intent="income" />
            <SummaryCard label="Total Expenses" amount={fmt(data.summary.totalExpenses)} intent="expense" />
            <SummaryCard label="Loan Cost" amount={fmt(data.summary.loanCost)} intent="loan" />
            <SummaryCard label="Net Income" amount={fmt(data.summary.netIncome)} intent="primary" />
          </SummaryCardGrid>

          {/* Two-column grid for detailed sections */}
          <div className={styles.detailGrid}>
            {/* Savings Card */}
            <Section title="Savings" icon="bank-account">
              <HTMLTable bordered className={styles.fullTable}>
                <tbody>
                  <tr>
                    <td>Previous Savings</td>
                    <td className={styles.alignRight}>{fmt(data.savings.previous)}</td>
                  </tr>
                  <tr>
                    <td>This Month (Leftover)</td>
                    <td
                      className={`${styles.alignRight} ${
                        data.savings.leftover >= 0
                          ? styles.income
                          : styles.expense
                      }`}
                    >
                      {fmt(data.savings.leftover)}
                    </td>
                  </tr>
                  <tr className={styles.totalRow}>
                    <td>
                      <strong>Total Savings</strong>
                    </td>
                    <td className={styles.alignRight}>
                      <strong>{fmt(data.savings.total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </HTMLTable>
            </Section>

            {/* Expenses by Currency */}
            <Section title="Expenses by Currency" icon="exchange">
              {data.expensesByCurrency.length > 0 ? (
                <HTMLTable bordered striped className={styles.fullTable}>
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th className={styles.alignRight}>Original Amount</th>
                      <th className={styles.alignRight}>In {currency}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expensesByCurrency.map((entry) => (
                      <tr key={entry.currency}>
                        <td>
                          <Tag minimal>{entry.currency}</Tag>
                        </td>
                        <td className={styles.alignRight}>
                          {fmtAny(entry.originalAmount, entry.currency)}
                        </td>
                        <td className={`${styles.alignRight} ${styles.expense}`}>
                          {fmt(entry.convertedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td>
                        <strong>Total</strong>
                      </td>
                      <td />
                      <td className={`${styles.alignRight} ${styles.expense}`}>
                        <strong>{fmt(data.summary.totalExpenses)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </HTMLTable>
              ) : (
                <div className={styles.emptyText}>No expenses this month</div>
              )}
            </Section>
          </div>

          {/* Planned vs Actual Income */}
          {data.plannedIncome && data.plannedIncome.length > 0 && (
            <div className={styles.detailGrid}>
              <Section title="Planned vs Actual Income" icon="comparison" className={styles.fullWidth}>
                <HTMLTable bordered striped className={styles.fullTable}>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th className={styles.alignRight}>Planned</th>
                      <th className={styles.alignRight}>Actual</th>
                      <th className={styles.alignRight}>Planned ({currency})</th>
                      <th className={styles.alignRight}>Actual ({currency})</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.plannedIncome.map((item) => (
                      <tr key={item.incomeSourceId}>
                        <td>{item.incomeSourceName}</td>
                        <td className={styles.alignRight}>
                          {fmtAny(item.plannedAmount, item.plannedCurrency)}
                        </td>
                        <td className={styles.alignRight}>
                          {fmtAny(item.actualAmount, item.plannedCurrency)}
                        </td>
                        <td className={styles.alignRight}>
                          {fmt(item.convertedPlannedAmount)}
                        </td>
                        <td className={`${styles.alignRight} ${styles.income}`}>
                          {fmt(item.convertedActualAmount)}
                        </td>
                        <td>
                          <Tag
                            intent={
                              item.status === 'received'
                                ? Intent.SUCCESS
                                : item.status === 'partial'
                                ? Intent.WARNING
                                : Intent.NONE
                            }
                            minimal
                          >
                            {item.status === 'received'
                              ? 'Received'
                              : item.status === 'partial'
                              ? 'Partial'
                              : 'Pending'}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </HTMLTable>
              </Section>
            </div>
          )}

          <div className={styles.detailGrid}>
            {/* Income by Source */}
            <Section title="Income by Source" icon="trending-up">
              {data.incomeBySource.length > 0 ? (
                <HTMLTable bordered striped className={styles.fullTable}>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th className={styles.alignRight}>Original</th>
                      <th className={styles.alignRight}>In {currency}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.incomeBySource.map((entry) => (
                      <tr key={entry.source}>
                        <td>{entry.source}</td>
                        <td className={styles.alignRight}>
                          {fmtAny(entry.originalAmount, entry.originalCurrency)}
                        </td>
                        <td className={`${styles.alignRight} ${styles.income}`}>
                          {fmt(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td>
                        <strong>Total</strong>
                      </td>
                      <td />
                      <td className={`${styles.alignRight} ${styles.income}`}>
                        <strong>{fmt(data.summary.grossIncome)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </HTMLTable>
              ) : (
                <div className={styles.emptyText}>No income this month</div>
              )}
            </Section>

            {/* Top Expense Categories */}
            <Section title="Top Expense Categories" icon="tag">
              {data.topCategories.length > 0 ? (
                <>
                  <CategoryPieChart categories={data.topCategories} formatter={fmt} />
                  <HTMLTable bordered striped className={styles.fullTable}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className={styles.alignRight}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCategories.map((cat, idx) => (
                        <tr key={idx}>
                          <td>{cat.name}</td>
                          <td className={`${styles.alignRight} ${styles.expense}`}>
                            {fmt(cat.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </HTMLTable>
                </>
              ) : (
                <div className={styles.emptyText}>
                  No categorized expenses this month
                </div>
              )}
            </Section>
          </div>

          <div className={styles.detailGrid}>
            {/* Loan Summary */}
            <Section title="Loan Summary" icon="credit-card">
              <HTMLTable bordered className={styles.fullTable}>
                <tbody>
                  <tr>
                    <td>Total Remaining</td>
                    <td className={`${styles.alignRight} ${styles.expense}`}>
                      {fmt(data.loanSummary.totalRemaining)}
                    </td>
                  </tr>
                  <tr>
                    <td>Monthly Payment</td>
                    <td className={styles.alignRight}>
                      {fmt(data.loanSummary.monthlyPayment)}
                    </td>
                  </tr>
                </tbody>
              </HTMLTable>
            </Section>

            {/* Subscriptions */}
            <Section title="Subscriptions" icon="repeat">
              <HTMLTable bordered className={styles.fullTable}>
                <tbody>
                  <tr>
                    <td>Monthly Total</td>
                    <td className={`${styles.alignRight} ${styles.expense}`}>
                      {fmt(data.subscriptionTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td>Transactions</td>
                    <td className={styles.alignRight}>
                      {data.summary.transactionCount}
                    </td>
                  </tr>
                </tbody>
              </HTMLTable>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
