'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
  NumericInput,
  HTMLSelect,
  Intent,
  NonIdealState,
  Alert,
  Text,
  Tag,
  ProgressBar,
  HTMLTable,
  H5,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { Divider } from '@blueprintjs/core';
import { getToaster } from '@/lib/toaster';
import { Currency } from '@budget/schemas';
import type { CreateBudgetTargetInput } from '@budget/schemas';
import { PlannedIncomeTable } from '../PlannedIncomeTable/PlannedIncomeTable';
import {
  useBudgetTargetComparison,
  useBudgetTargets,
  useCreateBudgetTarget,
  useUpdateBudgetTarget,
  useDeleteBudgetTarget,
  useCopyPreviousMonthTargets,
} from '../../hooks/use-budget-targets';
import { useCategories } from '@/features/settings/hooks/use-categories';
import styles from './BudgetView.module.scss';

export const BudgetView = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const displayCurrency = Currency.USD;

  const { data: comparison, isLoading } = useBudgetTargetComparison({
    month: selectedMonth,
    year: selectedYear,
    currency: displayCurrency,
  });

  const { data: budgetTargets } = useBudgetTargets({ year: selectedYear, month: selectedMonth });
  const { data: categories } = useCategories();

  const createMutation = useCreateBudgetTarget();
  const updateMutation = useUpdateBudgetTarget();
  const deleteMutation = useDeleteBudgetTarget();
  const copyMutation = useCopyPreviousMonthTargets();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateBudgetTargetInput>({
    name: '',
    categoryId: null,
    month: selectedMonth,
    year: selectedYear,
    targetAmount: 0,
    currency: Currency.USD,
  });

  const handleOpenDialog = (item?: {
    budgetTargetId: string;
    name: string;
    plannedAmount: number;
    plannedCurrency: string;
  }) => {
    if (item) {
      const target = budgetTargets?.find((t) => t.id === item.budgetTargetId);
      setEditingId(item.budgetTargetId);
      setFormData({
        name: item.name,
        categoryId: target?.category?.id || null,
        month: selectedMonth,
        year: selectedYear,
        targetAmount: item.plannedAmount,
        currency: item.plannedCurrency as Currency,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        categoryId: null,
        month: selectedMonth,
        year: selectedYear,
        targetAmount: 0,
        currency: Currency.USD,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          input: formData,
        });
        (await getToaster()).show({
          message: 'Planned expense updated',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync(formData);
        (await getToaster()).show({
          message: 'Planned expense created',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error: any) {
      const isConflict = error?.response?.status === 409;
      (await getToaster()).show({
        message: isConflict
          ? 'A planned expense with this name already exists for this month. Edit the existing one instead.'
          : 'Failed to save planned expense',
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
      (await getToaster()).show({
        message: 'Planned expense deleted',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch {
      (await getToaster()).show({
        message: 'Failed to delete planned expense',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  const handleCopyPrevious = async () => {
    try {
      const result = await copyMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
      });
      (await getToaster()).show({
        message: `Copied ${result.length} planned expenses from previous month`,
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
    } catch {
      (await getToaster()).show({
        message: 'Failed to copy from previous month',
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

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'paid':
        return <Tag intent={Intent.SUCCESS} minimal>Paid</Tag>;
      case 'partial':
        return <Tag intent={Intent.WARNING} minimal>Partial</Tag>;
      default:
        return <Tag minimal>Pending</Tag>;
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Text>Loading...</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Budget"
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
          </div>
        }
      />

      <div className={styles.section}>
        <div className={styles.header}>
          <H5 style={{ margin: 0 }}>Planned Expenses</H5>
          <div className={styles.headerActions}>
            <Button
              icon="duplicate"
              text="Copy Previous Month"
              small
              onClick={handleCopyPrevious}
              loading={copyMutation.isPending}
            />
            <Button
              icon="plus"
              text="Add Planned Expense"
              intent={Intent.PRIMARY}
              small
              onClick={() => handleOpenDialog()}
            />
          </div>
        </div>

        {!comparison || comparison.items.length === 0 ? (
          <div className={styles.emptyState}>
            <NonIdealState
              icon="dollar"
              title="No planned expenses"
              description="Add planned expenses to track obligatory monthly spending."
              action={
                <Button
                  intent={Intent.PRIMARY}
                  icon="plus"
                  text="Add Planned Expense"
                  onClick={() => handleOpenDialog()}
                />
              }
            />
          </div>
        ) : (
          <HTMLTable className={styles.table} striped interactive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Planned ({displayCurrency})</th>
                <th>Actual ({displayCurrency})</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comparison.items.map((item) => {
                const percentUsed =
                  item.plannedAmount > 0
                    ? (item.actualAmount / item.plannedAmount) * 100
                    : 0;
                const progressIntent = getProgressIntent(percentUsed);

                return (
                  <tr key={item.budgetTargetId}>
                    <td>{item.name}</td>
                    <td>{item.categoryName || '—'}</td>
                    <td>
                      {formatCurrency(item.plannedAmount, item.plannedCurrency)}
                    </td>
                    <td>
                      {formatCurrency(item.actualAmount, item.plannedCurrency)}
                    </td>
                    <td>
                      {formatCurrency(item.convertedPlannedAmount, displayCurrency)}
                    </td>
                    <td>
                      {formatCurrency(item.convertedActualAmount, displayCurrency)}
                    </td>
                    <td>
                      <div className={styles.statusCell}>
                        {getStatusTag(item.status)}
                        {item.linkedTransactionCount > 0 && (
                          <Tag minimal icon="link">
                            {item.linkedTransactionCount} tx
                          </Tag>
                        )}
                      </div>
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
                          onClick={() => handleOpenDialog(item)}
                        />
                        <Button
                          icon="trash"
                          minimal
                          small
                          intent={Intent.DANGER}
                          onClick={() => handleDeleteClick(item.budgetTargetId)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className={styles.totalsRow}>
                <td colSpan={4}>Total</td>
                <td>
                  {formatCurrency(comparison.totalPlanned, displayCurrency)}
                </td>
                <td>
                  {formatCurrency(comparison.totalActual, displayCurrency)}
                </td>
                <td />
                <td />
                <td />
              </tr>
            </tbody>
          </HTMLTable>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <PlannedIncomeTable
        month={selectedMonth}
        year={selectedYear}
        displayCurrency={displayCurrency}
      />

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingId ? 'Edit Planned Expense' : 'Add Planned Expense'}
      >
        <DialogBody>
          <FormGroup label="Name" labelFor="name" labelInfo="(required)">
            <InputGroup
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Family, Rent, Groceries"
            />
          </FormGroup>

          <FormGroup
            label="Category"
            labelFor="categoryId"
            helperText="Optional — link to a transaction category"
          >
            <HTMLSelect
              id="categoryId"
              value={formData.categoryId ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  categoryId: e.target.value || null,
                })
              }
              options={[
                { value: '', label: '— None —' },
                ...(categories ?? [])
                  .filter((c) => c.type === 'EXPENSE' || c.type === 'ANY')
                  .map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
              ]}
            />
          </FormGroup>

          <FormGroup label="Planned Amount" labelFor="targetAmount" labelInfo="(required)">
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
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={handleCloseDialog} />
              <Button
                text={editingId ? 'Update' : 'Create'}
                intent={Intent.PRIMARY}
                onClick={handleSubmit}
                disabled={!formData.name.trim() || formData.targetAmount <= 0}
                loading={createMutation.isPending || updateMutation.isPending}
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
        <p>Are you sure you want to delete this planned expense?</p>
      </Alert>
    </div>
  );
};
