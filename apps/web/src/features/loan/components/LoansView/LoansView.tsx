'use client';

import { useState } from 'react';
import {
  Button,
  Card,
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
  H3,
  Text,
  Tag,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { getToaster } from '@/lib/toaster';
import { Currency } from '@budget/schemas';
import {
  useLoans,
  useCreateLoan,
  useUpdateLoan,
  useDeleteLoan,
  useRecalculateLoans,
} from '../../hooks/use-loans';
import { CreateLoanInput } from '@budget/schemas';
import styles from './LoansView.module.scss';

export const LoansView = () => {
  const { data: loans, isLoading } = useLoans();
  const createMutation = useCreateLoan();
  const updateMutation = useUpdateLoan();
  const deleteMutation = useDeleteLoan();
  const recalculateMutation = useRecalculateLoans();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<{
    id: string;
    title: string;
    amountLeft: number;
    monthlyPayment: number;
    currency: Currency;
    holder: string;
    loanNumber: string;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateLoanInput>({
    title: '',
    amountLeft: 0,
    monthlyPayment: 0,
    currency: Currency.USD,
    holder: '',
    loanNumber: null,
  });

  const handleOpenDialog = (loan?: Record<string, any>) => {
    if (loan) {
      setEditingLoan({
        id: loan.id,
        title: loan.title,
        amountLeft: parseFloat(loan.amountLeft),
        monthlyPayment: parseFloat(loan.monthlyPayment),
        currency: loan.currency as Currency,
        holder: loan.holder,
        loanNumber: loan.loanNumber || '',
      });
      setFormData({
        title: loan.title,
        amountLeft: parseFloat(loan.amountLeft),
        monthlyPayment: parseFloat(loan.monthlyPayment),
        currency: loan.currency as Currency,
        holder: loan.holder,
        loanNumber: loan.loanNumber || null,
      });
    } else {
      setEditingLoan(null);
      setFormData({
        title: '',
        amountLeft: 0,
        monthlyPayment: 0,
        currency: Currency.USD,
        holder: '',
        loanNumber: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLoan(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingLoan) {
        await updateMutation.mutateAsync({
          id: editingLoan.id,
          input: formData,
        });
        (await getToaster()).show({
          message: 'Loan updated successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync(formData);
        (await getToaster()).show({
          message: 'Loan created successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to save loan',
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
        message: 'Loan deleted successfully',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to delete loan',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  const handleRecalculate = async () => {
    try {
      const result = await recalculateMutation.mutateAsync();
      (await getToaster()).show({
        message: result.created > 0
          ? `Created ${result.created} loan(s) from disbursement transactions`
          : 'No new loans to create — all disbursements are already linked',
        intent: result.created > 0 ? Intent.SUCCESS : Intent.NONE,
        icon: result.created > 0 ? 'tick' : 'info-sign',
      });
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to recalculate loans',
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

  const totalRemaining = loans?.reduce(
    (sum, loan) => sum + parseFloat(loan.amountLeft),
    0,
  ) || 0;

  const displayCurrency = loans?.[0]?.currency || Currency.USD;

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
        title="Loans"
        actions={
          <>
            <Button
              icon="refresh"
              text="Recalculate"
              onClick={handleRecalculate}
              loading={recalculateMutation.isPending}
            />
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Loan"
              onClick={() => handleOpenDialog()}
            />
          </>
        }
      />

      {totalRemaining > 0 && (
        <Card className={styles.totalCard}>
          <Text className={styles.totalLabel}>Total Remaining Debt</Text>
          <Tag intent={Intent.DANGER} large>
            {formatCurrency(totalRemaining, displayCurrency)}
          </Tag>
        </Card>
      )}

      {!loans || loans.length === 0 ? (
        <NonIdealState
          icon="bank-account"
          title="No loans"
          description="Add your first loan to track debt."
          action={
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Loan"
              onClick={() => handleOpenDialog()}
            />
          }
        />
      ) : (
        <div className={styles.loansGrid}>
          {loans.map((loan) => (
            <Card
              key={loan.id}
              className={styles.loanCard}
              interactive
              onClick={() => handleOpenDialog(loan)}
            >
              <div className={styles.cardHeader}>
                <H3 className={styles.cardTitle}>{loan.title}</H3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.amountRow}>
                  <Text className={styles.amountLabel}>Remaining:</Text>
                  <Tag intent={Intent.DANGER} large>
                    {formatCurrency(parseFloat(loan.amountLeft), loan.currency)}
                  </Tag>
                </div>
                <div className={styles.amountRow}>
                  <Text className={styles.amountLabel}>Monthly Payment:</Text>
                  <Tag intent={Intent.WARNING}>
                    {formatCurrency(parseFloat(loan.monthlyPayment), loan.currency)}
                  </Tag>
                </div>
                <Text className={styles.cardDetail}>Holder: {loan.holder}</Text>
                {loan.loanNumber && (
                  <Text className={styles.cardDetail}>
                    Loan Number: {loan.loanNumber}
                  </Text>
                )}
              </div>
              <div className={styles.cardActions}>
                <Button
                  intent={Intent.DANGER}
                  icon="trash"
                  minimal
                  small
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(loan.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingLoan ? 'Edit Loan' : 'Add Loan'}
      >
        <DialogBody>
          <FormGroup label="Title" labelFor="title" labelInfo="(required)">
            <InputGroup
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Loan name"
            />
          </FormGroup>

          <FormGroup label="Remaining Balance" labelFor="amountLeft" labelInfo="(required)">
            <NumericInput
              id="amountLeft"
              value={formData.amountLeft}
              onValueChange={(value) =>
                setFormData({ ...formData, amountLeft: value || 0 })
              }
              min={0}
              stepSize={0.01}
              minorStepSize={0.01}
              leftIcon="dollar"
              placeholder="0.00"
            />
          </FormGroup>

          <FormGroup label="Monthly Payment" labelFor="monthlyPayment" labelInfo="(required)">
            <NumericInput
              id="monthlyPayment"
              value={formData.monthlyPayment}
              onValueChange={(value) =>
                setFormData({ ...formData, monthlyPayment: value || 0 })
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

          <FormGroup label="Holder" labelFor="holder" labelInfo="(required)">
            <InputGroup
              id="holder"
              value={formData.holder}
              onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
              placeholder="Loan holder name"
            />
          </FormGroup>

          <FormGroup label="Loan Number" labelFor="loanNumber">
            <InputGroup
              id="loanNumber"
              value={formData.loanNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, loanNumber: e.target.value || null })
              }
              placeholder="Bank loan reference number"
            />
          </FormGroup>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={handleCloseDialog} />
              <Button
                text={editingLoan ? 'Update' : 'Create'}
                intent={Intent.PRIMARY}
                onClick={handleSubmit}
                disabled={
                  !formData.title ||
                  formData.amountLeft <= 0 ||
                  formData.monthlyPayment <= 0 ||
                  !formData.holder
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
        <p>Are you sure you want to delete this loan?</p>
      </Alert>
    </div>
  );
};
