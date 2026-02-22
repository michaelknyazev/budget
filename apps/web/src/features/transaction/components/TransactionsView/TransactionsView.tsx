'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  HTMLTable,
  Button,
  ButtonGroup,
  InputGroup,
  HTMLSelect,
  NonIdealState,
  Dialog,
  DialogBody,
  DialogFooter,
  Intent,
  Tag,
  Spinner,
  FormGroup,
  NumericInput,
  Alert,
} from '@blueprintjs/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../../hooks/use-transactions';
import { useCategories, Category } from '@/features/settings/hooks/use-categories';
import { useIncomeSources, IncomeSource } from '@/features/settings/hooks/use-income-sources';
import { usePlannedIncome, PlannedIncome } from '@/features/budget/hooks/use-planned-income';
import { useBudgetTargets, BudgetTarget } from '@/features/budget/hooks/use-budget-targets';
import { useLoans, Loan } from '@/features/loan/hooks/use-loans';
import { useDisplayCurrency } from '@/contexts/DisplayCurrencyContext';
import { useLatestRates } from '@/hooks/use-latest-rates';
import {
  TransactionType,
  Currency,
  INFLOW_TYPES,
  OUTFLOW_TYPES,
  LOAN_COST_TYPES,
  REAL_INCOME_TYPES,
  REAL_EXPENSE_TYPES,
  CreateTransactionInput,
  TransactionResponse,
  QueryTransactionsInput,
} from '@budget/schemas';
import styles from './TransactionsView.module.scss';

const EMPTY_FORM: CreateTransactionInput = {
  title: '',
  amount: 0,
  currency: Currency.GEL,
  type: TransactionType.EXPENSE,
  date: new Date().toISOString().split('T')[0],
  categoryId: null,
  incomeSourceId: null,
  plannedIncomeId: null,
  budgetTargetId: null,
  loanId: null,
  merchantName: null,
  merchantLocation: null,
  mccCode: null,
};

export function TransactionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const [filters, setFilters] = useState<QueryTransactionsInput>(() => {
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const currency = searchParams.get('currency');
    const categoryId = searchParams.get('categoryId');
    const merchantName = searchParams.get('merchant');
    const pageSize = searchParams.get('pageSize');
    const page = searchParams.get('page');

    return {
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 100,
      month: month ? parseInt(month) : now.getMonth() + 1,
      year: year ? parseInt(year) : now.getFullYear(),
      type: (type || undefined) as any,
      currency: (currency || undefined) as any,
      categoryId: categoryId || undefined,
      merchantName: merchantName || undefined,
    };
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.month) params.set('month', String(filters.month));
    if (filters.year) params.set('year', String(filters.year));
    if (filters.type) params.set('type', filters.type);
    if (filters.currency) params.set('currency', filters.currency);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.merchantName) params.set('merchant', filters.merchantName);
    if (filters.pageSize && filters.pageSize !== 100) params.set('pageSize', String(filters.pageSize));
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));

    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '/transactions', { scroll: false });
  }, [filters, router]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);
  const [form, setForm] = useState<CreateTransactionInput>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useTransactions(filters);
  const { data: categories } = useCategories();
  const { data: incomeSources } = useIncomeSources();
  const { displayCurrency } = useDisplayCurrency();
  const { data: latestRates } = useLatestRates();

  // Fetch planned income for the current year (used in the transaction form dropdown)
  const { data: plannedIncomeItems } = usePlannedIncome({ year: now.getFullYear() });
  // Also fetch previous year in case we're in January and need December entries
  const { data: plannedIncomePrevYear } = usePlannedIncome({ year: now.getFullYear() - 1 });

  const allPlannedIncome = [
    ...(plannedIncomePrevYear ?? []),
    ...(plannedIncomeItems ?? []),
  ];

  // Fetch budget targets for the planned expense dropdown
  const { data: budgetTargetItems } = useBudgetTargets({ year: now.getFullYear() });
  const { data: budgetTargetPrevYear } = useBudgetTargets({ year: now.getFullYear() - 1 });

  const allBudgetTargets = [
    ...(budgetTargetPrevYear ?? []),
    ...(budgetTargetItems ?? []),
  ];

  // Fetch loans for the loan dropdown
  const { data: loans } = useLoans();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const openCreate = useCallback(() => {
    setEditingTransaction(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setIsDialogOpen(true);
  }, []);

  const openEdit = useCallback((tx: TransactionResponse) => {
    setEditingTransaction(tx);
    setForm({
      title: tx.title,
      amount: tx.amount,
      currency: tx.currency as Currency,
      type: tx.type as TransactionType,
      date: tx.date,
      categoryId: tx.categoryId ?? null,
      incomeSourceId: tx.incomeSourceId ?? null,
      plannedIncomeId: tx.plannedIncomeId ?? null,
      budgetTargetId: tx.budgetTargetId ?? null,
      loanId: tx.loanId ?? null,
      merchantName: tx.merchantName ?? null,
      merchantLocation: tx.merchantLocation ?? null,
      mccCode: tx.mccCode ?? null,
    });
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleSave = async () => {
    if (editingTransaction) {
      await updateMutation.mutateAsync({ id: editingTransaction.id, input: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    closeDialog();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getAmountDisplay = (
    amount: number,
    type: string,
    currency: string,
    metadata?: Record<string, unknown> | null,
  ) => {
    const txType = type as TransactionType;
    const isLoanCost = LOAN_COST_TYPES.includes(txType);

    // For types with a fixed direction, use the constant lists
    let isInflow = INFLOW_TYPES.includes(txType);

    // For ambiguous types (FX_CONVERSION, TRANSFER), check metadata.direction
    if (!INFLOW_TYPES.includes(txType) && !OUTFLOW_TYPES.includes(txType)) {
      isInflow = metadata?.direction === 'inflow';
    }

    const prefix = isInflow ? '+' : '-';
    const formatted = formatCurrency(amount, currency);
    return { prefix, formatted, isInflow, isLoanCost };
  };

  const getAmountIntent = (isInflow: boolean, isLoanCost: boolean): Intent => {
    if (isLoanCost) return Intent.WARNING;
    return isInflow ? Intent.SUCCESS : Intent.DANGER;
  };

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId || !categories) return 'Uncategorized';
    const cat = categories.find((c: Category) => c.id === categoryId);
    return cat ? cat.name : 'Uncategorized';
  };

  const totalPages = data ? Math.ceil(data.total / (filters.pageSize || 100)) : 0;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spinner size={50} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Transactions"
        actions={
          <ButtonGroup>
            <Button
              intent={Intent.SUCCESS}
              icon="import"
              onClick={() => router.push('/transactions/import')}
            >
              Import Statement
            </Button>
            <Button intent={Intent.PRIMARY} icon="plus" onClick={openCreate}>
              Create Transaction
            </Button>
          </ButtonGroup>
        }
      />

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Month</label>
          <HTMLSelect
            value={filters.month?.toString() || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                month: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </HTMLSelect>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Year</label>
          <HTMLSelect
            value={filters.year?.toString() || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                year: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
          >
            <option value="">All Years</option>
            {Array.from({ length: now.getFullYear() - 2023 }, (_, i) => now.getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ),
            )}
          </HTMLSelect>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Type</label>
          <HTMLSelect
            value={filters.type || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                type: (e.target.value || undefined) as any,
              }))
            }
          >
            <option value="">All Types</option>
            {Object.values(TransactionType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </HTMLSelect>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Currency</label>
          <HTMLSelect
            value={filters.currency || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                currency: (e.target.value || undefined) as any,
              }))
            }
          >
            <option value="">All Currencies</option>
            {Object.values(Currency).map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </HTMLSelect>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Category</label>
          <HTMLSelect
            value={filters.categoryId || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                categoryId: e.target.value || undefined,
              }))
            }
          >
            <option value="">All Categories</option>
            {categories?.map((cat: Category) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </HTMLSelect>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Merchant</label>
          <InputGroup
            placeholder="Search merchant..."
            value={filters.merchantName || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                merchantName: e.target.value || undefined,
              }))
            }
            leftIcon="search"
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Per Page</label>
          <HTMLSelect
            value={filters.pageSize?.toString() || '100'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                pageSize: parseInt(e.target.value),
              }))
            }
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="1000">1000</option>
            <option value="100000">All</option>
          </HTMLSelect>
        </div>
      </div>

      {data && data.transactions.length === 0 ? (
        <NonIdealState
          icon="bank-account"
          title="No transactions found"
          description="Import a bank statement or create a new transaction."
          action={
            <ButtonGroup>
              <Button
                intent={Intent.SUCCESS}
                icon="import"
                onClick={() => router.push('/transactions/import')}
              >
                Import Statement
              </Button>
              <Button intent={Intent.PRIMARY} icon="plus" onClick={openCreate}>
                Create Transaction
              </Button>
            </ButtonGroup>
          }
        />
      ) : (
        <>
          <HTMLTable className={styles.table} striped bordered interactive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Currency</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions.map((transaction) => {
                const amountInfo = getAmountDisplay(
                  transaction.amount,
                  transaction.type,
                  transaction.currency,
                  transaction.metadata,
                );
                return (
                  <tr
                    key={transaction.id}
                    onClick={() => openEdit(transaction)}
                    className={styles.clickableRow}
                  >
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      {transaction.title}
                      {transaction.merchantName && transaction.merchantName !== transaction.title && (
                        <span className={styles.merchantHint}> ({transaction.merchantName})</span>
                      )}
                    </td>
                    <td>
                      <Tag minimal>{getCategoryName(transaction.categoryId)}</Tag>
                    </td>
                    <td>
                      <Tag intent={getAmountIntent(amountInfo.isInflow, amountInfo.isLoanCost)}>
                        {amountInfo.prefix}
                        {amountInfo.formatted}
                      </Tag>
                    </td>
                    <td>
                      <Tag minimal>{transaction.type}</Tag>
                    </td>
                    <td>{transaction.currency}</td>
                    <td>
                      <ButtonGroup minimal>
                        <Button icon="edit" small onClick={() => openEdit(transaction)} />
                        <Button
                          icon="trash"
                          small
                          intent={Intent.DANGER}
                          onClick={() => setDeleteId(transaction.id)}
                        />
                      </ButtonGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {data && data.transactions.length > 0 && (() => {
              const displayRate = latestRates?.[displayCurrency] ?? 1;

              let convertedInflow = 0;
              let convertedOutflow = 0;

              for (const tx of data.transactions) {
                const txType = tx.type as TransactionType;
                let isInflow = INFLOW_TYPES.includes(txType);
                if (!INFLOW_TYPES.includes(txType) && !OUTFLOW_TYPES.includes(txType)) {
                  isInflow = tx.metadata?.direction === 'inflow';
                }

                // Convert to display currency via GEL pivot:
                // amountInGel = amount * rateToGel
                // amountInDisplay = amountInGel / displayCurrencyRateToGel
                const rateToGel = tx.rateToGel ?? (latestRates?.[tx.currency] ?? 1);
                const converted = (tx.amount * rateToGel) / displayRate;

                if (isInflow) {
                  convertedInflow += converted;
                } else {
                  convertedOutflow += converted;
                }
              }

              const net = convertedInflow - convertedOutflow;

              return (
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan={2}>
                      <strong>Page Total</strong>{' '}
                      <Tag minimal>{displayCurrency}</Tag>
                    </td>
                    <td />
                    <td className={styles.alignRight}>
                      <Tag intent={Intent.SUCCESS}>
                        +{formatCurrency(convertedInflow, displayCurrency)}
                      </Tag>
                    </td>
                    <td className={styles.alignRight}>
                      <Tag intent={Intent.DANGER}>
                        -{formatCurrency(convertedOutflow, displayCurrency)}
                      </Tag>
                    </td>
                    <td className={styles.alignRight}>
                      <Tag intent={net >= 0 ? Intent.SUCCESS : Intent.DANGER}>
                        {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net), displayCurrency)}
                      </Tag>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              );
            })()}
          </HTMLTable>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <ButtonGroup>
                <Button
                  icon="chevron-left"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))}
                />
                <Button minimal>
                  Page {filters.page} of {totalPages}
                </Button>
                <Button
                  icon="chevron-right"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))}
                />
              </ButtonGroup>
              <span className={styles.totalCount}>
                {data?.total} transaction{data?.total !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        title={editingTransaction ? 'Edit Transaction' : 'Create Transaction'}
        style={{ width: 520 }}
      >
        <DialogBody>
          <FormGroup label="Title" labelInfo="(required)">
            <InputGroup
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Grocery shopping"
            />
          </FormGroup>

          <div className={styles.formRow}>
            <FormGroup label="Amount" labelInfo="(required)" className={styles.formHalf}>
              <NumericInput
                value={form.amount}
                onValueChange={(val) => setForm((f) => ({ ...f, amount: val }))}
                min={0}
                stepSize={0.01}
                minorStepSize={0.01}
                majorStepSize={1}
                fill
              />
            </FormGroup>

            <FormGroup label="Currency" className={styles.formHalf}>
              <HTMLSelect
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                fill
              >
                {Object.values(Currency).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>
          </div>

          <div className={styles.formRow}>
            <FormGroup label="Type" labelInfo="(required)" className={styles.formHalf}>
              <HTMLSelect
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as TransactionType }))
                }
                fill
              >
                {Object.values(TransactionType).map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>

            <FormGroup label="Date" labelInfo="(required)" className={styles.formHalf}>
              <InputGroup
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                fill
              />
            </FormGroup>
          </div>

          <FormGroup label="Category">
            <HTMLSelect
              value={form.categoryId ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoryId: e.target.value || null }))
              }
              fill
            >
              <option value="">Uncategorized</option>
              {categories?.map((cat: Category) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>

          {REAL_INCOME_TYPES.includes(form.type as TransactionType) && (
            <>
              <FormGroup label="Income Source" helperText="Link to an income source for tracking">
                <HTMLSelect
                  value={form.incomeSourceId ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, incomeSourceId: e.target.value || null }))
                  }
                  fill
                >
                  <option value="">None</option>
                  {incomeSources
                    ?.filter((s: IncomeSource) => s.isActive)
                    .map((source: IncomeSource) => (
                      <option key={source.id} value={source.id}>
                        {source.name} ({source.currency})
                      </option>
                    ))}
                </HTMLSelect>
              </FormGroup>

              <FormGroup label="Planned Income" helperText="Link to a planned income entry to confirm receipt">
                <HTMLSelect
                  value={form.plannedIncomeId ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, plannedIncomeId: e.target.value || null }))
                  }
                  fill
                >
                  <option value="">None</option>
                  {allPlannedIncome
                    .sort((a, b) => b.year - a.year || b.month - a.month)
                    .map((pi: PlannedIncome) => {
                      const monthName = new Date(pi.year, pi.month - 1, 1).toLocaleString('en-US', { month: 'short' });
                      return (
                        <option key={pi.id} value={pi.id}>
                          {monthName} {pi.year} — {pi.incomeSource.name} ({formatCurrency(parseFloat(pi.plannedAmount), pi.incomeSource.currency)})
                        </option>
                      );
                    })}
                </HTMLSelect>
              </FormGroup>
            </>
          )}

          {REAL_EXPENSE_TYPES.includes(form.type as TransactionType) && (
            <FormGroup label="Planned Expense" helperText="Link to a planned expense entry to track spending">
              <HTMLSelect
                value={form.budgetTargetId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetTargetId: e.target.value || null }))
                }
                fill
              >
                <option value="">None</option>
                {allBudgetTargets
                  .sort((a, b) => b.year - a.year || b.month - a.month)
                  .map((bt: BudgetTarget) => {
                    const monthName = new Date(bt.year, bt.month - 1, 1).toLocaleString('en-US', { month: 'short' });
                    return (
                      <option key={bt.id} value={bt.id}>
                        {monthName} {bt.year} — {bt.name} ({formatCurrency(parseFloat(bt.targetAmount), bt.currency)})
                      </option>
                    );
                  })}
              </HTMLSelect>
            </FormGroup>
          )}

          {[TransactionType.LOAN_REPAYMENT, TransactionType.LOAN_DISBURSEMENT, TransactionType.LOAN_INTEREST].includes(form.type as TransactionType) && (
            <FormGroup label="Loan" helperText="Link to a loan entry to track repayments">
              <HTMLSelect
                value={form.loanId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, loanId: e.target.value || null }))
                }
                fill
              >
                <option value="">None</option>
                {loans
                  ?.filter((loan: Loan) => !loan.isRepaid || loan.id === form.loanId)
                  .map((loan: Loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.title} ({formatCurrency(parseFloat(loan.amountLeft), loan.currency)}){loan.isRepaid ? ' (Repaid)' : ''}
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>
          )}

          <FormGroup label="Merchant Name">
            <InputGroup
              value={form.merchantName ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, merchantName: e.target.value || null }))
              }
              placeholder="e.g. Carrefour"
            />
          </FormGroup>

          <FormGroup label="Merchant Location">
            <InputGroup
              value={form.merchantLocation ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, merchantLocation: e.target.value || null }))
              }
              placeholder="e.g. Tbilisi, GE"
            />
          </FormGroup>
        </DialogBody>

        <DialogFooter
          actions={
            <>
              <Button onClick={closeDialog}>Cancel</Button>
              <Button
                intent={Intent.PRIMARY}
                onClick={handleSave}
                loading={isSaving}
                disabled={!form.title || !form.amount || !form.date}
              >
                {editingTransaction ? 'Save Changes' : 'Create'}
              </Button>
            </>
          }
        />
      </Dialog>

      {/* Delete Confirmation */}
      <Alert
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
      >
        <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
      </Alert>
    </div>
  );
}
