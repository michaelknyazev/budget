'use client';

import { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  NumericInput,
  HTMLSelect,
  Intent,
  NonIdealState,
  Alert,
  Text,
  ProgressBar,
  HTMLTable,
} from '@blueprintjs/core';
import { OverlayToaster } from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { Currency } from '@budget/schemas';
import {
  useBudgetTargets,
  useCreateBudgetTarget,
  useUpdateBudgetTarget,
  useDeleteBudgetTarget,
} from '../../hooks/use-budget-targets';
import { useTransactions } from '@/features/transaction/hooks/use-transactions';
import { CreateBudgetTargetInput } from '@budget/schemas';
import { TransactionType } from '@budget/schemas';
import styles from './BudgetView.module.scss';

const toaster = OverlayToaster.createAsync({ position: 'top' });

export const BudgetView = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data: targets, isLoading: targetsLoading } = useBudgetTargets({
    month: selectedMonth,
    year: selectedYear,
  });

  const { data: transactionsData } = useTransactions({
    month: selectedMonth,
    year: selectedYear,
    page: 1,
    pageSize: 10000,
  });

  const createMutation = useCreateBudgetTarget();
  const updateMutation = useUpdateBudgetTarget();
  const deleteMutation = useDeleteBudgetTarget();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{
    id: string;
    categoryId: string | null;
    month: number;
    year: number;
    targetAmount: number;
    currency: Currency;
    type: 'EXPENSE' | 'INCOME';
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateBudgetTargetInput>({
    categoryId: null,
    month: selectedMonth,
    year: selectedYear,
    targetAmount: 0,
    currency: Currency.USD,
    type: 'EXPENSE',
  });

  // Calculate actuals from transactions
  const actualsByCategory = useMemo(() => {
    if (!transactionsData?.transactions) return new Map<string, number>();

    const actuals = new Map<string, number>();
    const expenseTypes: TransactionType[] = [
      TransactionType.EXPENSE,
      TransactionType.FEE,
      TransactionType.ATM_WITHDRAWAL,
    ];
    const incomeTypes: TransactionType[] = [
      TransactionType.INCOME,
      TransactionType.INTEREST_INCOME,
    ];

    transactionsData.transactions.forEach((transaction) => {
      const categoryId = transaction.categoryId || 'total';
      const amount = parseFloat(String(transaction.amount));

      if (expenseTypes.includes(transaction.type as TransactionType)) {
        const current = actuals.get(`expense-${categoryId}`) || 0;
        actuals.set(`expense-${categoryId}`, current + amount);
      } else if (incomeTypes.includes(transaction.type as TransactionType)) {
        const current = actuals.get(`income-${categoryId}`) || 0;
        actuals.set(`income-${categoryId}`, current + amount);
      }
    });

    return actuals;
  }, [transactionsData]);

  const handleOpenDialog = (target?: Record<string, any>) => {
    if (target) {
      setEditingTarget({
        id: target.id,
        categoryId: target.categoryId,
        month: target.month,
        year: target.year,
        targetAmount: parseFloat(target.targetAmount),
        currency: target.currency as Currency,
        type: target.type,
      });
      setFormData({
        categoryId: target.categoryId || null,
        month: target.month,
        year: target.year,
        targetAmount: parseFloat(target.targetAmount),
        currency: target.currency as Currency,
        type: target.type,
      });
    } else {
      setEditingTarget(null);
      setFormData({
        categoryId: null,
        month: selectedMonth,
        year: selectedYear,
        targetAmount: 0,
        currency: Currency.USD,
        type: 'EXPENSE',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTarget(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingTarget) {
        await updateMutation.mutateAsync({
          id: editingTarget.id,
          input: formData,
        });
        (await toaster).show({
          message: 'Budget target updated successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync(formData);
        (await toaster).show({
          message: 'Budget target created successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error) {
      (await toaster).show({
        message: 'Failed to save budget target',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      (await toaster).show({
        message: 'Budget target deleted successfully',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch (error) {
      (await toaster).show({
        message: 'Failed to delete budget target',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getProgressIntent = (percentUsed: number): Intent => {
    if (percentUsed < 80) return Intent.SUCCESS;
    if (percentUsed <= 100) return Intent.WARNING;
    return Intent.DANGER;
  };

  const getActualAmount = (target: Record<string, any>): number => {
    const key = `${target?.type.toLowerCase()}-${target?.categoryId || 'total'}`;
    return actualsByCategory.get(key) || 0;
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

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i);

  if (targetsLoading) {
    return (
      <div className={styles.container}>
        <Text>Loading...</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Budget Targets"
        actions={
          <div className={styles.controls}>
            <HTMLSelect
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              options={monthNames.map((name, index) => ({
                value: index + 1,
                label: name,
              }))}
            />
            <HTMLSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={years.map((year) => ({
                value: year,
                label: year.toString(),
              }))}
            />
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Target"
              onClick={() => handleOpenDialog()}
            />
          </div>
        }
      />

      {!targets || targets.length === 0 ? (
        <NonIdealState
          icon="chart"
          title="No budget targets"
          description={`Set budget targets for ${monthNames[selectedMonth - 1]} ${selectedYear}.`}
          action={
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Target"
              onClick={() => handleOpenDialog()}
            />
          }
        />
      ) : (
        <HTMLTable className={styles.table} striped interactive>
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th>Target</th>
              <th>Actual</th>
              <th>Remaining</th>
              <th>% Used</th>
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const actual = getActualAmount(target);
              const targetAmount = parseFloat(target.targetAmount);
              const remaining = targetAmount - actual;
              const percentUsed = targetAmount > 0 ? (actual / targetAmount) * 100 : 0;
              const progressIntent = getProgressIntent(percentUsed);

              return (
                <tr key={target.id}>
                  <td>{target.category?.name || 'Total'}</td>
                  <td>
                    <Text className={styles.typeText}>{target.type}</Text>
                  </td>
                  <td>{formatCurrency(targetAmount, target.currency)}</td>
                  <td>{formatCurrency(actual, target.currency)}</td>
                  <td>
                    <span style={{ color: remaining < 0 ? 'var(--pt-intent-danger-color)' : 'var(--pt-intent-success-color)' }}>
                      {formatCurrency(remaining, target.currency)}
                    </span>
                  </td>
                  <td>
                    <span>{percentUsed.toFixed(1)}%</span>
                  </td>
                  <td>
                    <ProgressBar
                      value={Math.min(percentUsed / 100, 1)}
                      intent={progressIntent}
                      stripes={false}
                    />
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        icon="edit"
                        minimal
                        small
                        onClick={() => handleOpenDialog(target)}
                      />
                      <Button
                        icon="trash"
                        minimal
                        small
                        intent={Intent.DANGER}
                        onClick={() => handleDeleteClick(target.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </HTMLTable>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingTarget ? 'Edit Budget Target' : 'Add Budget Target'}
      >
        <DialogBody>
          <FormGroup label="Month" labelFor="month">
            <NumericInput
              id="month"
              value={formData.month}
              onValueChange={(value) =>
                setFormData({ ...formData, month: value || 1 })
              }
              min={1}
              max={12}
              stepSize={1}
            />
          </FormGroup>

          <FormGroup label="Year" labelFor="year">
            <NumericInput
              id="year"
              value={formData.year}
              onValueChange={(value) =>
                setFormData({ ...formData, year: value || currentDate.getFullYear() })
              }
              min={2020}
              max={2100}
              stepSize={1}
            />
          </FormGroup>

          <FormGroup label="Target Amount" labelFor="targetAmount" labelInfo="(required)">
            <NumericInput
              id="targetAmount"
              value={formData.targetAmount}
              onValueChange={(value) =>
                setFormData({ ...formData, targetAmount: value || 0 })
              }
              min={0}
              stepSize={0.01}
              minorStepSize={0.01}
              leftIcon="dollar"
              placeholder="0.00"
            />
          </FormGroup>

          <FormGroup label="Currency" labelFor="currency">
            <HTMLSelect
              id="currency"
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value as Currency })
              }
              options={Object.values(Currency)}
            />
          </FormGroup>

          <FormGroup label="Type" labelFor="type">
            <HTMLSelect
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'EXPENSE' | 'INCOME',
                })
              }
              options={['EXPENSE', 'INCOME']}
            />
          </FormGroup>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={handleCloseDialog} />
              <Button
                text={editingTarget ? 'Update' : 'Create'}
                intent={Intent.PRIMARY}
                onClick={handleSubmit}
                disabled={formData.targetAmount <= 0}
              />
            </>
          }
        />
      </Dialog>

      <Alert
        isOpen={isDeleteAlertOpen}
        onClose={() => {
          setIsDeleteAlertOpen(false);
          setDeleteId(null);
        }}
        onConfirm={handleDeleteConfirm}
        intent={Intent.DANGER}
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      >
        <p>Are you sure you want to delete this budget target?</p>
      </Alert>
    </div>
  );
};
