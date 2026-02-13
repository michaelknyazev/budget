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
  Switch,
  Intent,
  NonIdealState,
  Alert,
  H3,
  Text,
  Tag,
  Tabs,
  Tab,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { getToaster } from '@/lib/toaster';
import { Currency, CategoryType, AccountType } from '@budget/schemas';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/use-categories';
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
} from '../../hooks/use-bank-accounts';
import {
  useIncomeSources,
  useCreateIncomeSource,
  useUpdateIncomeSource,
  useDeleteIncomeSource,
} from '../../hooks/use-income-sources';
import { CreateCategoryInput } from '@budget/schemas';
import { CreateBankAccountInput } from '@budget/schemas';
import { CreateIncomeSourceInput } from '@budget/schemas';
import styles from './SettingsView.module.scss';

export const SettingsView = () => {
  const [selectedTabId, setSelectedTabId] = useState<string>('categories');

  return (
    <div className={styles.container}>
      <PageHeader title="Settings" />
      <Tabs
        id="settings-tabs"
        selectedTabId={selectedTabId}
        onChange={(tabId) => setSelectedTabId(tabId as string)}
        large
      >
        <Tab id="categories" title="Categories" panel={<CategoriesTab />} />
        <Tab id="bank-accounts" title="Bank Accounts" panel={<BankAccountsTab />} />
        <Tab id="income-sources" title="Income Sources" panel={<IncomeSourcesTab />} />
      </Tabs>
    </div>
  );
};

const CategoriesTab = () => {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    type: CategoryType;
    icon: string | null;
    color: string | null;
    mccCodes: number[] | null;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    type: CategoryType.EXPENSE,
    icon: null,
    color: null,
    mccCodes: null,
  });

  const handleOpenDialog = (category?: Record<string, any>) => {
    if (category) {
      setEditingCategory({
        id: category.id,
        name: category.name,
        type: category.type as CategoryType,
        icon: category.icon,
        color: category.color,
        mccCodes: category.mccCodes,
      });
      setFormData({
        name: category.name,
        type: category.type as CategoryType,
        icon: category.icon || null,
        color: category.color || null,
        mccCodes: category.mccCodes || null,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: CategoryType.EXPENSE,
        icon: null,
        color: null,
        mccCodes: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          input: formData,
        });
        (await getToaster()).show({
          message: 'Category updated successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync(formData);
        (await getToaster()).show({
          message: 'Category created successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to save category',
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
        message: 'Category deleted successfully',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to delete category',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <Button
          intent={Intent.PRIMARY}
          icon="plus"
          text="Add Category"
          onClick={() => handleOpenDialog()}
        />
      </div>

      {!categories || categories.length === 0 ? (
        <NonIdealState
          icon="tag"
          title="No categories"
          description="Create categories to organize your transactions."
          action={
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Category"
              onClick={() => handleOpenDialog()}
            />
          }
        />
      ) : (
        <div className={styles.itemsGrid}>
          {categories.map((category) => (
            <Card key={category.id} className={styles.itemCard} interactive>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  {category.icon && (
                    <Tag icon={category.icon as any} intent="none">
                      {category.name}
                    </Tag>
                  )}
                  {!category.icon && <H3 className={styles.cardTitle}>{category.name}</H3>}
                </div>
                <div className={styles.cardActions}>
                  <Button
                    icon="edit"
                    minimal
                    small
                    onClick={() => handleOpenDialog(category)}
                  />
                  <Button
                    icon="trash"
                    minimal
                    small
                    intent={Intent.DANGER}
                    onClick={() => handleDeleteClick(category.id)}
                  />
                </div>
              </div>
              <div className={styles.cardContent}>
                <Text className={styles.cardDetail}>Type: {category.type}</Text>
                {category.color && (
                  <Text className={styles.cardDetail}>Color: {category.color}</Text>
                )}
                {category.mccCodes && category.mccCodes.length > 0 && (
                  <Text className={styles.cardDetail}>
                    MCC Codes: {category.mccCodes.join(', ')}
                  </Text>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <DialogBody>
          <FormGroup label="Name" labelFor="name" labelInfo="(required)">
            <InputGroup
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Category name"
            />
          </FormGroup>

          <FormGroup label="Type" labelFor="type">
            <HTMLSelect
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as CategoryType })
              }
              options={Object.values(CategoryType)}
            />
          </FormGroup>

          <FormGroup label="Icon" labelFor="icon">
            <InputGroup
              id="icon"
              value={formData.icon || ''}
              onChange={(e) =>
                setFormData({ ...formData, icon: e.target.value || null })
              }
              placeholder="Blueprint icon name (e.g., 'tag', 'dollar')"
            />
          </FormGroup>

          <FormGroup label="Color" labelFor="color">
            <InputGroup
              id="color"
              value={formData.color || ''}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value || null })
              }
              placeholder="Color name or hex"
            />
          </FormGroup>

          <FormGroup label="MCC Codes" labelFor="mccCodes">
            <InputGroup
              id="mccCodes"
              value={formData.mccCodes?.join(', ') || ''}
              onChange={(e) => {
                const codes = e.target.value
                  .split(',')
                  .map((s) => parseInt(s.trim()))
                  .filter((n) => !isNaN(n));
                setFormData({
                  ...formData,
                  mccCodes: codes.length > 0 ? codes : null,
                });
              }}
              placeholder="Comma-separated MCC codes (e.g., 5411, 5812)"
            />
          </FormGroup>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={handleCloseDialog} />
              <Button
                text={editingCategory ? 'Update' : 'Create'}
                intent={Intent.PRIMARY}
                onClick={handleSubmit}
                disabled={!formData.name}
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
        <p>Are you sure you want to delete this category?</p>
      </Alert>
    </div>
  );
};

const BankAccountsTab = () => {
  const { data: bankAccounts, isLoading } = useBankAccounts();
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{
    id: string;
    iban: string;
    bankName: string;
    bankCode: string | null;
    accountOwner: string;
    accountType: AccountType;
    interestRate: number | null;
    effectiveRate: number | null;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateBankAccountInput>({
    iban: '',
    bankName: '',
    bankCode: null,
    accountOwner: '',
    accountType: AccountType.CHECKING,
    interestRate: null,
    effectiveRate: null,
  });

  const handleOpenDialog = (account?: Record<string, any>) => {
    if (account) {
      setEditingAccount({
        id: account.id,
        iban: account.iban,
        bankName: account.bankName,
        bankCode: account.bankCode,
        accountOwner: account.accountOwner,
        accountType: account.accountType as AccountType,
        interestRate: account.interestRate,
        effectiveRate: account.effectiveRate,
      });
      setFormData({
        iban: account.iban,
        bankName: account.bankName,
        bankCode: account.bankCode || null,
        accountOwner: account.accountOwner,
        accountType: account.accountType as AccountType,
        interestRate: account.interestRate || null,
        effectiveRate: account.effectiveRate || null,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        iban: '',
        bankName: '',
        bankCode: null,
        accountOwner: '',
        accountType: AccountType.CHECKING,
        interestRate: null,
        effectiveRate: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingAccount) {
        await updateMutation.mutateAsync({
          id: editingAccount.id,
          input: formData,
        });
        (await getToaster()).show({
          message: 'Bank account updated successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync(formData);
        (await getToaster()).show({
          message: 'Bank account created successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to save bank account',
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
        message: 'Bank account deleted successfully',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to delete bank account',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <Button
          intent={Intent.PRIMARY}
          icon="plus"
          text="Add Bank Account"
          onClick={() => handleOpenDialog()}
        />
      </div>

      {!bankAccounts || bankAccounts.length === 0 ? (
        <NonIdealState
          icon="bank-account"
          title="No bank accounts"
          description="Add bank accounts to import statements."
          action={
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Bank Account"
              onClick={() => handleOpenDialog()}
            />
          }
        />
      ) : (
        <div className={styles.itemsGrid}>
          {bankAccounts.map((account) => (
            <Card key={account.id} className={styles.itemCard} interactive>
              <div className={styles.cardHeader}>
                <H3 className={styles.cardTitle}>{account.bankName}</H3>
                <div className={styles.cardActions}>
                  <Button
                    icon="edit"
                    minimal
                    small
                    onClick={() => handleOpenDialog(account)}
                  />
                  <Button
                    icon="trash"
                    minimal
                    small
                    intent={Intent.DANGER}
                    onClick={() => handleDeleteClick(account.id)}
                  />
                </div>
              </div>
              <div className={styles.cardContent}>
                <Text className={styles.cardDetail}>IBAN: {account.iban}</Text>
                <Text className={styles.cardDetail}>
                  Owner: {account.accountOwner}
                </Text>
                <Text className={styles.cardDetail}>Type: {account.accountType}</Text>
                {account.bankCode && (
                  <Text className={styles.cardDetail}>SWIFT: {account.bankCode}</Text>
                )}
                {account.interestRate && (
                  <Text className={styles.cardDetail}>
                    Interest Rate: {account.interestRate}%
                  </Text>
                )}
                {account.effectiveRate && (
                  <Text className={styles.cardDetail}>
                    Effective Rate: {account.effectiveRate}%
                  </Text>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
      >
        <DialogBody>
          <FormGroup label="IBAN" labelFor="iban" labelInfo="(required)">
            <InputGroup
              id="iban"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              placeholder="IBAN"
            />
          </FormGroup>

          <FormGroup label="Bank Name" labelFor="bankName" labelInfo="(required)">
            <InputGroup
              id="bankName"
              value={formData.bankName}
              onChange={(e) =>
                setFormData({ ...formData, bankName: e.target.value })
              }
              placeholder="Bank name"
            />
          </FormGroup>

          <FormGroup label="SWIFT/BIC Code" labelFor="bankCode">
            <InputGroup
              id="bankCode"
              value={formData.bankCode || ''}
              onChange={(e) =>
                setFormData({ ...formData, bankCode: e.target.value || null })
              }
              placeholder="SWIFT/BIC code"
            />
          </FormGroup>

          <FormGroup label="Account Owner" labelFor="accountOwner" labelInfo="(required)">
            <InputGroup
              id="accountOwner"
              value={formData.accountOwner}
              onChange={(e) =>
                setFormData({ ...formData, accountOwner: e.target.value })
              }
              placeholder="Account owner name"
            />
          </FormGroup>

          <FormGroup label="Account Type" labelFor="accountType">
            <HTMLSelect
              id="accountType"
              value={formData.accountType}
              onChange={(e) =>
                setFormData({ ...formData, accountType: e.target.value as AccountType })
              }
              options={Object.values(AccountType)}
            />
          </FormGroup>

          <FormGroup label="Interest Rate (%)" labelFor="interestRate">
            <NumericInput
              id="interestRate"
              value={formData.interestRate || 0}
              onValueChange={(value) =>
                setFormData({ ...formData, interestRate: value || null })
              }
              min={0}
              max={100}
              stepSize={0.01}
              placeholder="Annual interest rate"
            />
          </FormGroup>

          <FormGroup label="Effective Rate (%)" labelFor="effectiveRate">
            <NumericInput
              id="effectiveRate"
              value={formData.effectiveRate || 0}
              onValueChange={(value) =>
                setFormData({ ...formData, effectiveRate: value || null })
              }
              min={0}
              max={100}
              stepSize={0.01}
              placeholder="Effective annual rate"
            />
          </FormGroup>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={handleCloseDialog} />
              <Button
                text={editingAccount ? 'Update' : 'Create'}
                intent={Intent.PRIMARY}
                onClick={handleSubmit}
                disabled={
                  !formData.iban || !formData.bankName || !formData.accountOwner
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
        <p>Are you sure you want to delete this bank account?</p>
      </Alert>
    </div>
  );
};

const IncomeSourcesTab = () => {
  const { data: incomeSources, isLoading } = useIncomeSources();
  const createMutation = useCreateIncomeSource();
  const updateMutation = useUpdateIncomeSource();
  const deleteMutation = useDeleteIncomeSource();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<{
    id: string;
    name: string;
    currency: Currency;
    defaultAmount: number | null;
    isActive: boolean;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateIncomeSourceInput>({
    name: '',
    currency: Currency.USD,
    defaultAmount: null,
    isActive: true,
  });

  const handleOpenDialog = (source?: Record<string, any>) => {
    if (source) {
      setEditingSource({
        id: source.id,
        name: source.name,
        currency: source.currency as Currency,
        defaultAmount: source.defaultAmount,
        isActive: source.isActive,
      });
      setFormData({
        name: source.name,
        currency: source.currency as Currency,
        defaultAmount: source.defaultAmount || null,
        isActive: source.isActive,
      });
    } else {
      setEditingSource(null);
      setFormData({
        name: '',
        currency: Currency.USD,
        defaultAmount: null,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSource(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingSource) {
        await updateMutation.mutateAsync({
          id: editingSource.id,
          input: formData,
        });
        (await getToaster()).show({
          message: 'Income source updated successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      } else {
        await createMutation.mutateAsync(formData);
        (await getToaster()).show({
          message: 'Income source created successfully',
          intent: Intent.SUCCESS,
          icon: 'tick',
        });
      }
      handleCloseDialog();
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to save income source',
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
        message: 'Income source deleted successfully',
        intent: Intent.SUCCESS,
        icon: 'tick',
      });
      setIsDeleteAlertOpen(false);
      setDeleteId(null);
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to delete income source',
        intent: Intent.DANGER,
        icon: 'error',
      });
    }
  };

  const handleToggleActive = async (source: Record<string, any>) => {
    if (!source) return;
    try {
      await updateMutation.mutateAsync({
        id: source.id,
        input: { isActive: !source.isActive },
      });
    } catch (error) {
      (await getToaster()).show({
        message: 'Failed to update income source',
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

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <Button
          intent={Intent.PRIMARY}
          icon="plus"
          text="Add Income Source"
          onClick={() => handleOpenDialog()}
        />
      </div>

      {!incomeSources || incomeSources.length === 0 ? (
        <NonIdealState
          icon="dollar"
          title="No income sources"
          description="Add income sources to track your earnings."
          action={
            <Button
              intent={Intent.PRIMARY}
              icon="plus"
              text="Add Income Source"
              onClick={() => handleOpenDialog()}
            />
          }
        />
      ) : (
        <div className={styles.itemsGrid}>
          {incomeSources.map((source) => (
            <Card key={source.id} className={styles.itemCard} interactive>
              <div className={styles.cardHeader}>
                <H3 className={styles.cardTitle}>{source.name}</H3>
                <Switch
                  checked={source.isActive}
                  onChange={() => handleToggleActive(source)}
                />
              </div>
              <div className={styles.cardContent}>
                <Tag intent={Intent.SUCCESS}>
                  {source.currency}
                  {source.defaultAmount &&
                    ` - ${formatCurrency(source.defaultAmount, source.currency)}`}
                </Tag>
              </div>
              <div className={styles.cardActions}>
                <Button
                  icon="edit"
                  minimal
                  small
                  onClick={() => handleOpenDialog(source)}
                />
                <Button
                  icon="trash"
                  minimal
                  small
                  intent={Intent.DANGER}
                  onClick={() => handleDeleteClick(source.id)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={editingSource ? 'Edit Income Source' : 'Add Income Source'}
      >
        <DialogBody>
          <FormGroup label="Name" labelFor="name" labelInfo="(required)">
            <InputGroup
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Income source name"
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

          <FormGroup label="Default Amount" labelFor="defaultAmount">
            <NumericInput
              id="defaultAmount"
              value={formData.defaultAmount || 0}
              onValueChange={(value) =>
                setFormData({ ...formData, defaultAmount: value || null })
              }
              min={0}
              stepSize={0.01}
              minorStepSize={0.01}
              leftIcon="dollar"
              placeholder="Expected monthly amount"
            />
          </FormGroup>

          <FormGroup label="Active">
            <Switch
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.currentTarget.checked })
              }
            />
          </FormGroup>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={handleCloseDialog} />
              <Button
                text={editingSource ? 'Update' : 'Create'}
                intent={Intent.PRIMARY}
                onClick={handleSubmit}
                disabled={!formData.name}
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
        <p>Are you sure you want to delete this income source?</p>
      </Alert>
    </div>
  );
};
