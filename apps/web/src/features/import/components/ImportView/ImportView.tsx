'use client';

import { useState } from 'react';
import {
  FileInput,
  Button,
  Callout,
  Spinner,
  Intent,
} from '@blueprintjs/core';
import { PageHeader } from '@/components/shared/PageHeader';
import { useBankImport } from '../../hooks/use-bank-import';
import styles from './ImportView.module.scss';

export function ImportView() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const importMutation = useBankImport();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    importMutation.mutate({ file: selectedFile });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={styles.container}>
      <PageHeader title="Import Bank Statement" />

      <div className={styles.uploadSection}>
        <FileInput
          text={selectedFile?.name || 'Choose XLSX file...'}
          onInputChange={handleFileChange}
          inputProps={{ accept: '.xlsx,.xls' }}
        />
        <Button
          intent={Intent.PRIMARY}
          icon="import"
          onClick={handleUpload}
          disabled={!selectedFile || importMutation.isPending}
          loading={importMutation.isPending}
        >
          Upload and Import
        </Button>
      </div>

      {importMutation.isPending && (
        <div className={styles.loading}>
          <Spinner size={50} />
          <p>Processing import...</p>
        </div>
      )}

      {importMutation.isSuccess && importMutation.data && (
        <Callout intent={Intent.SUCCESS} icon="tick" title="Import Successful">
          <div className={styles.results}>
            <p>
              <strong>Created:</strong> {importMutation.data.created} transactions
            </p>
            <p>
              <strong>Skipped:</strong> {importMutation.data.skipped} duplicates
            </p>
            <p>
              <strong>Total:</strong> {importMutation.data.totalTransactions} transactions processed
            </p>
            {importMutation.data.loanCostTotal > 0 && (
              <p>
                <strong>Loan Cost:</strong> {formatCurrency(importMutation.data.loanCostTotal)}
              </p>
            )}
          </div>
        </Callout>
      )}

      {importMutation.isError && (
        <Callout intent={Intent.DANGER} icon="error" title="Import Failed">
          {importMutation.error?.message || 'An error occurred during import'}
        </Callout>
      )}
    </div>
  );
}
