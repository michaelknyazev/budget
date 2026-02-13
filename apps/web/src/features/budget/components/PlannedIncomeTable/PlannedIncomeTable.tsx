'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  NumericInput,
  HTMLSelect,
  HTMLTable,
  InputGroup,
  Intent,
  Tag,
  NonIdealState,
  Alert,
  H5,
} from '@blueprintjs/core';
import { getToaster } from '@/lib/toaster';
import { Currency } from '@budget/schemas';
import { useIncomeSources } from '@/features/settings/hooks/use-income-sources';
import {
  usePlannedIncomeComparison,
  useCreatePlannedIncome,
  useUpdatePlannedIncome,
  useDeletePlannedIncome,
  useCopyPreviousMonth,
  usePlannedIncome,
} from '../../hooks/use-planned-income';
import styles from './PlannedIncomeTable.module.scss';

interface PlannedIncomeTableProps {
  month: number;
  year: number;
  displayCurrency: string;
}

export const PlannedIncomeTable = ({
  month,
  year,
  displayCurrency,
}: PlannedIncomeTableProps) => {
  const { data: comparison, isLoading } = usePlannedIncomeComparison({
    month,
    year,
    currency: displayCurrency,
  });

  const { data: plannedItems } = usePlannedIncome({ year, month });
  const { data: incomeSources } = useIncomeSources();

  const createMutation = useCreatePlannedIncome();
  const updateMutation = useUpdatePlannedIncome();
  const deleteMutation = useDeletePlannedIncome();
  const copyMutation = useCopyPreviousMonth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    incomeSourceId: '',
    plannedAmount: 0,
    notes: '',
  });

  // Income sources not yet planned for this month
  const unplannedSources = incomeSources?.filter(
    (source) =>
      source.isActive &&
      !comparison?.items.some(
        (item) => item.incomeSourceId === source.id,
      ),
  );

  const hasUnplannedSources = unplannedSources && unplannedSources.length > 0;
  const hasAnySources = incomeSources && incomeSources.length > 0;

  const handleOpenDialog = (item?: {
    plannedIncomeId: string;
    incomeSourceId: string;
    plannedAmount: number;
  }) => {
    if (item) {
      const planned = plannedItems?.find(
        (p) => p.id === item.plannedIncomeId,
      );
      setEditingId(item.plannedIncomeId);
      setFormData({
        incomeSourceId: item.incomeSourceId,
        plannedAmount: item.plannedAmount,
        notes: planned?.notes ?? '',
      });
    } else {
      setEditingId(null);
      setFormData({
        incomeSourceId: unplannedSources?.[0]?.id ?? '',
        plannedAmount: 0,
        notes: '',
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
          input: {
            plannedAmount: formData.plannedAmount,
            notes: formData.notes || null,
          },
        });
        (await getToaster()).show({
          message: 'Planned income updated',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync({
          incomeSourceId: formData.incomeSourceId,
          month,
          year,
          plannedAmount: formData.plannedAmount,
          notes: formData.notes || null,
        });
        (await getToaster()).show({
          message: 'Planned income created',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error: any) {
      const isConflict = error?.response?.status === 409;
      (await getToaster()).show({
        message: isConflict
          ? 'This income source already has a planned entry for this month. Edit the existing one instead.'
          : 'Failed to save planned income',
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
        message: 'Planned income deleted',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch {
      (await getToaster()).show({
        message: 'Failed to delete planned income',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  const handleCopyPrevious = async () => {
    try {
      const result = await copyMutation.mutateAsync({ month, year });
      (await getToaster()).show({
        message: `Copied ${result.length} planned income entries from previous month`,
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

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'received':
        return <Tag intent={Intent.SUCCESS} minimal>Received</Tag>;
      case 'partial':
        return <Tag intent={Intent.WARNING} minimal>Partial</Tag>;
      default:
        return <Tag minimal>Pending</Tag>;
    }
  };

  if (isLoading) {
    return <div className={styles.section}>Loading planned income...</div>;
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <H5 style={{ margin: 0 }}>Planned Income</H5>
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
            text="Add Planned Income"
            intent={Intent.PRIMARY}
            small
            onClick={() => handleOpenDialog()}
            disabled={!hasUnplannedSources}
            title={
              !hasAnySources
                ? 'Create income sources in Settings first'
                : !hasUnplannedSources
                  ? 'All income sources already have planned entries for this month'
                  : undefined
            }
          />
        </div>
      </div>

      {!comparison || comparison.items.length === 0 ? (
        <div className={styles.emptyState}>
          <NonIdealState
            icon="bank-account"
            title="No planned income"
            description="Add planned income for each income source to track expected vs actual."
            action={
              <Button
                intent={Intent.PRIMARY}
                icon="plus"
                text="Add Planned Income"
                onClick={() => handleOpenDialog()}
                disabled={!hasUnplannedSources}
              />
            }
          />
        </div>
      ) : (
        <HTMLTable className={styles.table} striped interactive>
          <thead>
            <tr>
              <th>Source</th>
              <th>Currency</th>
              <th>Planned</th>
              <th>Actual</th>
              <th>Planned ({displayCurrency})</th>
              <th>Actual ({displayCurrency})</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comparison.items.map((item) => (
              <tr key={item.plannedIncomeId}>
                <td>{item.incomeSourceName}</td>
                <td>{item.plannedCurrency}</td>
                <td>
                  {formatCurrency(
                    item.plannedAmount,
                    item.plannedCurrency,
                  )}
                </td>
                <td>
                  {formatCurrency(
                    item.actualAmount,
                    item.plannedCurrency,
                  )}
                </td>
                <td>
                  {formatCurrency(
                    item.convertedPlannedAmount,
                    displayCurrency,
                  )}
                </td>
                <td>
                  {formatCurrency(
                    item.convertedActualAmount,
                    displayCurrency,
                  )}
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
                      onClick={() =>
                        handleDeleteClick(item.plannedIncomeId)
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr className={styles.totalsRow}>
              <td colSpan={4}>Total</td>
              <td>
                {formatCurrency(
                  comparison.totalPlanned,
                  displayCurrency,
                )}
              </td>
              <td>
                {formatCurrency(
                  comparison.totalActual,
                  displayCurrency,
                )}
              </td>
              <td />
              <td />
            </tr>
          </tbody>
        </HTMLTable>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingId ? 'Edit Planned Income' : 'Add Planned Income'}
      >
        <DialogBody>
          {!editingId && (
            <FormGroup
              label="Income Source"
              labelFor="incomeSourceId"
              labelInfo="(required)"
            >
              <HTMLSelect
                id="incomeSourceId"
                value={formData.incomeSourceId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    incomeSourceId: e.target.value,
                  })
                }
                options={
                  (unplannedSources ?? incomeSources ?? []).map(
                    (source) => ({
                      value: source.id,
                      label: `${source.name} (${source.currency})`,
                    }),
                  )
                }
              />
            </FormGroup>
          )}

          <FormGroup
            label="Planned Amount"
            labelFor="plannedAmount"
            labelInfo="(required)"
          >
            <NumericInput
              id="plannedAmount"
              value={formData.plannedAmount}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  plannedAmount: value || 0,
                })
              }
              min={0}
              stepSize={0.01}
              minorStepSize={0.01}
              leftIcon="dollar"
              placeholder="0.00"
            />
          </FormGroup>

          <FormGroup label="Notes" labelFor="notes">
            <InputGroup
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Optional memo"
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
                disabled={
                  formData.plannedAmount <= 0 ||
                  (!editingId && !formData.incomeSourceId)
                }
                loading={
                  createMutation.isPending || updateMutation.isPending
                }
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
        <p>Are you sure you want to delete this planned income?</p>
      </Alert>
    </div>
  );
};
