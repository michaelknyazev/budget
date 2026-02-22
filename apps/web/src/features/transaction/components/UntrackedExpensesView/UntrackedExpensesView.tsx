'use client';

import { useState, useCallback } from 'react';
import {
  HTMLTable,
  HTMLSelect,
  NonIdealState,
  Spinner,
  Tag,
  Intent,
  Button,
  ButtonGroup,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
  NumericInput,
  Alert,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useTransactions,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../../hooks/use-transactions';
import { useCategories, Category } from '@/features/settings/hooks/use-categories';
import { useIncomeSources, IncomeSource } from '@/features/settings/hooks/use-income-sources';
import { usePlannedIncome, PlannedIncome } from '@/features/budget/hooks/use-planned-income';
import { useBudgetTargets, BudgetTarget } from '@/features/budget/hooks/use-budget-targets';
import { useLoans, Loan } from '@/features/loan/hooks/use-loans';
import {
  TransactionType,
  Currency,
  REAL_INCOME_TYPES,
  REAL_EXPENSE_TYPES,
  CreateTransactionInput,
  TransactionResponse,
  QueryTransactionsInput,
} from '@budget/schemas';
import styles from './UntrackedExpensesView.module.scss';

const now = new Date();

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

export const UntrackedExpensesView = () => {
  const [filters, setFilters] = useState<QueryTransactionsInput>({
    page: 1,
    pageSize: 100000,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    untrackedExpenses: true,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);
  const [form, setForm] = useState<CreateTransactionInput>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useTransactions(filters);
  const { data: categories } = useCategories();
  const { data: incomeSources } = useIncomeSources();
  const { data: loans } = useLoans();

  const { data: plannedIncomeItems } = usePlannedIncome({ year: now.getFullYear() });
  const { data: plannedIncomePrevYear } = usePlannedIncome({ year: now.getFullYear() - 1 });
  const allPlannedIncome = [
    ...(plannedIncomePrevYear ?? []),
    ...(plannedIncomeItems ?? []),
  ];

  const { data: budgetTargetItems } = useBudgetTargets({ year: now.getFullYear() });
  const { data: budgetTargetPrevYear } = useBudgetTargets({ year: now.getFullYear() - 1 });
  const allBudgetTargets = [
    ...(budgetTargetPrevYear ?? []),
    ...(budgetTargetItems ?? []),
  ];

  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

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
    }
    closeDialog();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const transactions = data?.transactions || [];

  const totalsByCurrency = transactions.reduce<Record<string, number>>((acc, t) => {
    const cur = t.currency;
    acc[cur] = (acc[cur] || 0) + parseFloat(String(t.amount));
    return acc;
  }, {});

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId || !categories) return 'Uncategorized';
    const cat = categories.find((c: Category) => c.id === categoryId);
    return cat ? cat.name : 'Uncategorized';
  };

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isSaving = updateMutation.isPending;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <PageHeader title="Untracked Expenses" />
        <div className={styles.loading}>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader title="Untracked Expenses" />

      <div className={styles.filters}>
        <HTMLSelect
          value={filters.month?.toString() || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
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

        <HTMLSelect
          value={filters.year?.toString() || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
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

      {transactions.length === 0 ? (
        <NonIdealState
          icon="tick-circle"
          title="All expenses are budgeted"
          description="Every expense transaction for this period is linked to a budget target."
        />
      ) : (
        <HTMLTable bordered striped interactive className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th className={styles.alignRight}>Amount</th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{formatDate(tx.date)}</td>
                <td>{tx.title}</td>
                <td>
                  <Tag minimal>{getCategoryName(tx.categoryId)}</Tag>
                </td>
                <td>
                  <Tag minimal intent={Intent.DANGER}>
                    {tx.type}
                  </Tag>
                </td>
                <td className={`${styles.alignRight} ${styles.expenseText}`}>
                  {formatCurrency(parseFloat(String(tx.amount)), tx.currency)}
                </td>
                <td>
                  <ButtonGroup minimal>
                    <Button icon="edit" small onClick={() => openEdit(tx)} />
                    <Button
                      icon="trash"
                      small
                      intent={Intent.DANGER}
                      onClick={() => setDeleteId(tx.id)}
                    />
                  </ButtonGroup>
                </td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td colSpan={5}>
                Total ({transactions.length} transaction{transactions.length !== 1 ? 's' : ''})
                {' — '}
                <span className={styles.expenseText}>
                  {Object.entries(totalsByCurrency)
                    .map(([cur, amt]) => formatCurrency(amt, cur))
                    .join(' + ')}
                </span>
              </td>
              <td />
            </tr>
          </tbody>
        </HTMLTable>
      )}

      {/* Edit Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        title="Edit Transaction"
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
            <FormGroup label="Budget Target" helperText="Link to a budget target to track spending">
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
                Save Changes
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
};
