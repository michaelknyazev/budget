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
  Switch,
  Intent,
  NonIdealState,
  Alert,
  Tag,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardGrid, ItemCard } from '@/components/shared/CardGrid';
import { Currency } from '@budget/schemas';
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
} from '../../hooks/use-subscriptions';
import styles from './SubscriptionsView.module.scss';

interface FormData {
  id?: string;
  title: string;
  amount: number;
  currency: string;
  dayOfMonth: number;
  owner: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  title: '',
  amount: 0,
  currency: 'USD',
  dayOfMonth: 1,
  owner: '',
  isActive: true,
};

const formatAmount = (amount: number | string, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(typeof amount === 'string' ? parseFloat(amount) : amount);

export function SubscriptionsView() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const handleOpenDialog = (sub?: Record<string, any>) => {
    if (sub) {
      setFormData({
        id: sub.id,
        title: sub.title,
        amount: parseFloat(sub.amount),
        currency: sub.currency,
        dayOfMonth: sub.dayOfMonth,
        owner: sub.owner || '',
        isActive: sub.isActive,
      });
    } else {
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      title: formData.title,
      amount: formData.amount,
      currency: formData.currency as any,
      dayOfMonth: formData.dayOfMonth,
      owner: formData.owner || null,
      isActive: formData.isActive,
    };

    if (formData.id) {
      await updateMutation.mutateAsync({ id: formData.id, input: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const monthlyTotal = (subscriptions || [])
    .filter((s: any) => s.isActive)
    .reduce(
      (acc: Record<string, number>, s: any) => {
        const cur = s.currency;
        acc[cur] = (acc[cur] || 0) + parseFloat(s.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

  if (isLoading) {
    return <NonIdealState icon="refresh" title="Loading subscriptions..." />;
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Subscriptions"
        actions={
          <Button
            icon="plus"
            intent={Intent.PRIMARY}
            text="Add Subscription"
            onClick={() => handleOpenDialog()}
          />
        }
      />

      <div className={styles.monthlyTotal}>
        {Object.entries(monthlyTotal).map(([cur, total]) => (
          <Tag key={cur} large minimal intent={Intent.PRIMARY}>
            Monthly: {formatAmount(total, cur)}
          </Tag>
        ))}
      </div>

      {!subscriptions?.length ? (
        <NonIdealState
          icon="th-list"
          title="No subscriptions"
          description="Add your recurring subscriptions to track them."
          action={
            <Button
              icon="plus"
              intent={Intent.PRIMARY}
              text="Add Subscription"
              onClick={() => handleOpenDialog()}
            />
          }
        />
      ) : (
        <CardGrid>
          {subscriptions.map((sub: any) => (
            <ItemCard
              key={sub.id}
              interactive
              onClick={() => handleOpenDialog(sub)}
            >
              <ItemCard.Header>
                <strong>{sub.title}</strong>
                <Tag intent={sub.isActive ? Intent.SUCCESS : Intent.NONE} minimal>
                  {sub.isActive ? 'Active' : 'Inactive'}
                </Tag>
              </ItemCard.Header>
              <ItemCard.Body>
                <div className={styles.cardAmount}>
                  {formatAmount(sub.amount, sub.currency)}
                </div>
                <div className={styles.cardDetails}>
                  <span>Day {sub.dayOfMonth}</span>
                  {sub.owner && <span>{sub.owner}</span>}
                </div>
              </ItemCard.Body>
              <ItemCard.Actions>
                <Button
                  small
                  minimal
                  icon="trash"
                  intent={Intent.DANGER}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(sub.id);
                    setIsDeleteOpen(true);
                  }}
                />
              </ItemCard.Actions>
            </ItemCard>
          ))}
        </CardGrid>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={formData.id ? 'Edit Subscription' : 'Add Subscription'}
      >
        <DialogBody>
          <FormGroup label="Title">
            <InputGroup
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup label="Amount">
            <NumericInput
              value={formData.amount}
              onValueChange={(val) =>
                setFormData({ ...formData, amount: val })
              }
              min={0}
              stepSize={1}
              minorStepSize={0.01}
            />
          </FormGroup>
          <FormGroup label="Currency">
            <HTMLSelect
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              options={Object.values(Currency)}
            />
          </FormGroup>
          <FormGroup label="Billing Day">
            <NumericInput
              value={formData.dayOfMonth}
              onValueChange={(val) =>
                setFormData({ ...formData, dayOfMonth: val })
              }
              min={1}
              max={31}
            />
          </FormGroup>
          <FormGroup label="Owner">
            <InputGroup
              value={formData.owner}
              onChange={(e) =>
                setFormData({ ...formData, owner: e.target.value })
              }
            />
          </FormGroup>
          <Switch
            label="Active"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({
                ...formData,
                isActive: (e.target as HTMLInputElement).checked,
              })
            }
          />
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={() => setIsDialogOpen(false)} />
              <Button
                text="Save"
                intent={Intent.PRIMARY}
                onClick={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
              />
            </>
          }
        />
      </Dialog>

      <Alert
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
      >
        Are you sure you want to delete this subscription?
      </Alert>
    </div>
  );
}
