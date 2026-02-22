'use client';

import { useState, useMemo } from 'react';
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
  NonIdealState,
} from '@blueprintjs/core';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { useDisplayCurrency } from '@/contexts/DisplayCurrencyContext';
import { useMonthlySummary } from '../../hooks/use-monthly-summary';
import { useYearlySummary } from '@/features/reports/hooks/use-yearly-summary';
import { useTransactions } from '@/features/transaction/hooks/use-transactions';
import { useCategories, Category } from '@/features/settings/hooks/use-categories';
import { useLatestRates } from '@/hooks/use-latest-rates';
import {
  TransactionType,
  INFLOW_TYPES,
  OUTFLOW_TYPES,
  LOAN_COST_TYPES,
} from '@budget/schemas';
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
  const [day, setDay] = useState(now.getDate());
  const { displayCurrency: currency } = useDisplayCurrency();
  const router = useRouter();

  const { data, isLoading } = useMonthlySummary(month, year, currency);
  const { data: yearlyData, isLoading: yearlyLoading } = useYearlySummary(
    year,
    currency,
  );
  const { data: dailyData, isLoading: dailyLoading } = useTransactions({
    day,
    month,
    year,
    page: 1,
    pageSize: 1000,
  });
  const { data: categories } = useCategories();
  const { data: latestRates } = useLatestRates();

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

  const fmtVariance = (planned: number, actual: number) => {
    const diff = actual - planned;
    const prefix = diff >= 0 ? '+' : '';
    return prefix + fmtCompact(diff);
  };

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId || !categories) return 'Uncategorized';
    const cat = categories.find((c: Category) => c.id === categoryId);
    return cat ? cat.name : 'Uncategorized';
  };

  const getAmountDisplay = (
    amount: number,
    type: string,
    txCurrency: string,
    metadata?: Record<string, unknown> | null,
  ) => {
    const txType = type as TransactionType;
    const isLoanCost = LOAN_COST_TYPES.includes(txType);
    let isInflow = INFLOW_TYPES.includes(txType);
    if (!INFLOW_TYPES.includes(txType) && !OUTFLOW_TYPES.includes(txType)) {
      isInflow = metadata?.direction === 'inflow';
    }
    const prefix = isInflow ? '+' : '-';
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: txCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return { prefix, formatted, isInflow, isLoanCost };
  };

  const getAmountIntent = (isInflow: boolean, isLoanCost: boolean): Intent => {
    if (isLoanCost) return Intent.WARNING;
    return isInflow ? Intent.SUCCESS : Intent.DANGER;
  };

  const dailyTotals = useMemo(() => {
    if (!dailyData?.transactions.length) return null;
    const displayRate = latestRates?.[currency] ?? 1;
    let inflow = 0;
    let outflow = 0;
    for (const tx of dailyData.transactions) {
      const txType = tx.type as TransactionType;
      let isInflow = INFLOW_TYPES.includes(txType);
      if (!INFLOW_TYPES.includes(txType) && !OUTFLOW_TYPES.includes(txType)) {
        isInflow = tx.metadata?.direction === 'inflow';
      }
      const rateToGel = tx.rateToGel ?? (latestRates?.[tx.currency] ?? 1);
      const converted = (tx.amount * rateToGel) / displayRate;
      if (isInflow) {
        inflow += converted;
      } else {
        outflow += converted;
      }
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [dailyData, latestRates, currency]);

  const navigateDay = (direction: 'prev' | 'next') => {
    const current = new Date(Date.UTC(year, month - 1, day));
    const delta = direction === 'prev' ? -1 : 1;
    current.setUTCDate(current.getUTCDate() + delta);
    setDay(current.getUTCDate());
    setMonth(current.getUTCMonth() + 1);
    setYear(current.getUTCFullYear());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = month;
    let newYear = year;
    if (direction === 'prev') {
      if (month === 1) { newMonth = 12; newYear = year - 1; }
      else { newMonth = month - 1; }
    } else {
      if (month === 12) { newMonth = 1; newYear = year + 1; }
      else { newMonth = month + 1; }
    }
    const maxDay = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
    setMonth(newMonth);
    setYear(newYear);
    if (day > maxDay) setDay(maxDay);
  };

  const dayLabel = `${day} ${MONTH_SHORT[month - 1]} ${year}`;

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

        {data && data.depositBalance > 0 && (
          <Card className={styles.summaryCard} elevation={0}>
            <H4 className={styles.cardLabel}>Deposit Balance</H4>
            <div className={`${styles.cardAmount} ${styles.income}`}>
              {formatCurrency(data.depositBalance)}
            </div>
          </Card>
        )}

        <Card className={styles.summaryCard} elevation={0}>
          <H4 className={styles.cardLabel}>Current Balance</H4>
          <div className={`${styles.cardAmount} ${styles.primary}`}>
            {data ? formatCurrency(data.currentBalance) : formatCurrency(0)}
          </div>
        </Card>

        {data && data.totalLoanAmount > 0 && (
          <Card className={styles.summaryCard} elevation={0}>
            <H4 className={styles.cardLabel}>Loan Amount</H4>
            <div className={`${styles.cardAmount} ${styles.loan}`}>
              {formatCurrency(data.totalLoanAmount)}
            </div>
          </Card>
        )}

        {data && data.untrackedIncome > 0 && (
          <Card
            className={styles.summaryCard}
            elevation={0}
            interactive
            onClick={() => router.push('/transactions/untracked-income')}
          >
            <H4 className={styles.cardLabel}>Untracked Income</H4>
            <div className={`${styles.cardAmount} ${styles.warning}`}>
              {formatCurrency(data.untrackedIncome)}
            </div>
          </Card>
        )}

        {data && data.untrackedExpenses > 0 && (
          <Card
            className={styles.summaryCard}
            elevation={0}
            interactive
            onClick={() => router.push('/transactions/untracked-expenses')}
          >
            <H4 className={styles.cardLabel}>Untracked Expenses</H4>
            <div className={`${styles.cardAmount} ${styles.warning}`}>
              {formatCurrency(data.untrackedExpenses)}
            </div>
          </Card>
        )}
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

      {/* Daily Transactions */}
      <Section
        title="Daily Transactions"
        icon="timeline-events"
        rightElement={
          <ButtonGroup>
            <Button icon="chevron-left" small onClick={() => navigateDay('prev')} />
            <Button minimal small>
              {dayLabel}
            </Button>
            <Button icon="chevron-right" small onClick={() => navigateDay('next')} />
          </ButtonGroup>
        }
      >
        {dailyLoading ? (
          <Spinner size={30} />
        ) : !dailyData?.transactions.length ? (
          <NonIdealState
            icon="bank-account"
            title="No transactions"
            description={`No transactions on ${dayLabel}.`}
          />
        ) : (
          <div className={styles.tableScroll}>
            <HTMLTable bordered striped className={styles.dailyTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th className={styles.alignRight}>Amount</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.transactions.map((tx) => {
                  const info = getAmountDisplay(tx.amount, tx.type, tx.currency, tx.metadata);
                  return (
                    <tr key={tx.id}>
                      <td>{tx.title}</td>
                      <td>
                        <Tag minimal>{getCategoryName(tx.categoryId)}</Tag>
                      </td>
                      <td className={styles.alignRight}>
                        <Tag intent={getAmountIntent(info.isInflow, info.isLoanCost)}>
                          {info.prefix}{info.formatted}
                        </Tag>
                      </td>
                      <td>
                        <Tag minimal>{tx.type.replace(/_/g, ' ')}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {dailyTotals && (
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td>
                      <strong>Total ({dailyData.transactions.length})</strong>
                    </td>
                    <td className={styles.alignRight}>
                      <Tag intent={Intent.SUCCESS}>
                        +{formatCurrency(dailyTotals.inflow)}
                      </Tag>
                    </td>
                    <td className={styles.alignRight}>
                      <Tag intent={Intent.DANGER}>
                        -{formatCurrency(dailyTotals.outflow)}
                      </Tag>
                    </td>
                    <td className={styles.alignRight}>
                      <Tag intent={dailyTotals.net >= 0 ? Intent.SUCCESS : Intent.DANGER}>
                        {dailyTotals.net >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(dailyTotals.net))}
                      </Tag>
                    </td>
                  </tr>
                </tfoot>
              )}
            </HTMLTable>
          </div>
        )}
      </Section>

      {/* Yearly Planned vs Actual Summary Cards */}
      {yearlyData && (
        <Section title={`${year} Planned vs Actual`} icon="comparison">
          <div className={styles.yearSummaryGrid}>
            <Card className={styles.yearSummaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Income</H4>
              <div className={styles.yearCardRow}>
                <span className={styles.yearCardLabel}>Planned</span>
                <span className={`${styles.yearCardValue} ${styles.plannedText} ${styles.incomeText}`}>
                  {fmtCompact(yearlyData.totals.plannedIncome)}
                </span>
              </div>
              <div className={styles.yearCardRow}>
                <span className={styles.yearCardLabel}>Actual</span>
                <span className={`${styles.yearCardValue} ${styles.incomeText}`}>
                  {fmtCompact(yearlyData.totals.grossIncome)}
                </span>
              </div>
              <div className={styles.varianceRow}>
                <span
                  className={
                    yearlyData.totals.grossIncome >= yearlyData.totals.plannedIncome
                      ? styles.variancePositive
                      : styles.varianceNegative
                  }
                >
                  {fmtVariance(yearlyData.totals.plannedIncome, yearlyData.totals.grossIncome)}
                </span>
              </div>
            </Card>

            <Card className={styles.yearSummaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Expenses</H4>
              <div className={styles.yearCardRow}>
                <span className={styles.yearCardLabel}>Planned</span>
                <span className={`${styles.yearCardValue} ${styles.plannedText} ${styles.expenseText}`}>
                  {fmtCompact(yearlyData.totals.plannedExpenses)}
                </span>
              </div>
              <div className={styles.yearCardRow}>
                <span className={styles.yearCardLabel}>Actual</span>
                <span className={`${styles.yearCardValue} ${styles.expenseText}`}>
                  {fmtCompact(yearlyData.totals.totalExpenses)}
                </span>
              </div>
              <div className={styles.varianceRow}>
                <span
                  className={
                    yearlyData.totals.totalExpenses <= yearlyData.totals.plannedExpenses
                      ? styles.variancePositive
                      : styles.varianceNegative
                  }
                >
                  {fmtVariance(yearlyData.totals.plannedExpenses, yearlyData.totals.totalExpenses)}
                </span>
              </div>
            </Card>

            <Card className={styles.yearSummaryCard} elevation={0}>
              <H4 className={styles.cardLabel}>Net Income (Savings)</H4>
              <div className={styles.yearCardRow}>
                <span className={styles.yearCardLabel}>Planned</span>
                <span className={`${styles.yearCardValue} ${styles.plannedText} ${styles.incomeText}`}>
                  {fmtCompact(yearlyData.totals.plannedNetIncome)}
                </span>
              </div>
              <div className={styles.yearCardRow}>
                <span className={styles.yearCardLabel}>Actual</span>
                <span
                  className={`${styles.yearCardValue} ${
                    yearlyData.totals.netIncome >= 0 ? styles.incomeText : styles.expenseText
                  }`}
                >
                  {fmtCompact(yearlyData.totals.netIncome)}
                </span>
              </div>
              <div className={styles.varianceRow}>
                <span
                  className={
                    yearlyData.totals.netIncome >= yearlyData.totals.plannedNetIncome
                      ? styles.variancePositive
                      : styles.varianceNegative
                  }
                >
                  {fmtVariance(yearlyData.totals.plannedNetIncome, yearlyData.totals.netIncome)}
                </span>
              </div>
            </Card>
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
          <>
            {yearlyData.startingBalance !== 0 && (
              <div className={styles.baselineRow}>
                <Tag minimal icon="bank-account" large>
                  Starting Balance (prior years + account balances):{' '}
                  <strong>{fmtCompact(yearlyData.startingBalance)}</strong>
                </Tag>
              </div>
            )}
            <div className={styles.tableScroll}>
            <HTMLTable bordered striped interactive className={styles.yearlyTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>Month</th>
                  <th colSpan={2} className={styles.groupHeader}>
                    Income
                  </th>
                  <th colSpan={2} className={styles.groupHeader}>
                    Expenses
                  </th>
                  <th colSpan={2} className={styles.groupHeader}>
                    Net Income
                  </th>
                  <th rowSpan={2} className={`${styles.alignRight} ${styles.subHeader}`}>
                    Savings
                  </th>
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
                {yearlyData.months.map((m, idx) => {
                  const isCurrentMonth =
                    year === now.getFullYear() && idx === now.getMonth();
                  const hasActual =
                    m.grossIncome > 0 || m.totalExpenses > 0 || m.loanCost > 0;
                  const hasPlanned =
                    m.plannedIncome > 0 || m.plannedExpenses > 0;

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
                      {/* Income: Planned / Actual */}
                      <td className={`${styles.alignRight} ${styles.incomeText} ${styles.plannedText}`}>
                        {hasPlanned ? fmtCompact(m.plannedIncome) : '-'}
                      </td>
                      <td className={`${styles.alignRight} ${styles.incomeText}`}>
                        {hasActual ? fmtCompact(m.grossIncome) : '-'}
                      </td>
                      {/* Expenses: Planned / Actual */}
                      <td className={`${styles.alignRight} ${styles.expenseText} ${styles.plannedText}`}>
                        {hasPlanned ? fmtCompact(m.plannedExpenses) : '-'}
                      </td>
                      <td className={`${styles.alignRight} ${styles.expenseText}`}>
                        {hasActual ? fmtCompact(m.totalExpenses) : '-'}
                      </td>
                      {/* Net Income: Planned / Actual */}
                      <td
                        className={`${styles.alignRight} ${styles.plannedText} ${
                          m.plannedNetIncome >= 0 ? styles.incomeText : styles.expenseText
                        }`}
                      >
                        {hasPlanned ? fmtCompact(m.plannedNetIncome) : '-'}
                      </td>
                      <td
                        className={`${styles.alignRight} ${
                          m.netIncome >= 0 ? styles.incomeText : styles.expenseText
                        }`}
                      >
                        {hasActual ? fmtCompact(m.netIncome) : '-'}
                      </td>
                      {/* Cumulative Savings */}
                      <td
                        className={`${styles.alignRight} ${
                          (yearlyData.cumulativeSavings[idx] ?? 0) >= 0
                            ? styles.incomeText
                            : styles.expenseText
                        }`}
                      >
                        {hasActual
                          ? fmtCompact(yearlyData.cumulativeSavings[idx] ?? 0)
                          : '-'}
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
                  <td className={`${styles.alignRight} ${styles.incomeText} ${styles.plannedText}`}>
                    <strong>{fmtCompact(yearlyData.totals.plannedIncome)}</strong>
                  </td>
                  <td className={`${styles.alignRight} ${styles.incomeText}`}>
                    <strong>{fmtCompact(yearlyData.totals.grossIncome)}</strong>
                  </td>
                  <td className={`${styles.alignRight} ${styles.expenseText} ${styles.plannedText}`}>
                    <strong>{fmtCompact(yearlyData.totals.plannedExpenses)}</strong>
                  </td>
                  <td className={`${styles.alignRight} ${styles.expenseText}`}>
                    <strong>{fmtCompact(yearlyData.totals.totalExpenses)}</strong>
                  </td>
                  <td
                    className={`${styles.alignRight} ${styles.plannedText} ${
                      yearlyData.totals.plannedNetIncome >= 0
                        ? styles.incomeText
                        : styles.expenseText
                    }`}
                  >
                    <strong>{fmtCompact(yearlyData.totals.plannedNetIncome)}</strong>
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
                  <td
                    className={`${styles.alignRight} ${
                      (yearlyData.cumulativeSavings[11] ?? 0) >= 0
                        ? styles.incomeText
                        : styles.expenseText
                    }`}
                  >
                    <strong>
                      {fmtCompact(yearlyData.cumulativeSavings[11] ?? 0)}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </HTMLTable>
          </div>
          </>
        ) : null}
      </Section>
    </div>
  );
}
