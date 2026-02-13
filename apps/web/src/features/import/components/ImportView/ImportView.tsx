'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Button,
  Callout,
  Card,
  Collapse,
  HTMLTable,
  Intent,
  ProgressBar,
  Spinner,
  Tag,
} from '@blueprintjs/core';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { useBankImport, type ImportResult } from '../../hooks/use-bank-import';
import styles from './ImportView.module.scss';

// ── Types ────────────────────────────────────────────────────

type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  result?: ImportResult;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtBalance(balance: Record<string, number>): React.ReactNode {
  const entries = Object.entries(balance).filter(([, v]) => v !== 0);
  if (entries.length === 0) return <span className={styles.balanceChip}>0</span>;
  return (
    <div className={styles.balanceParts}>
      {entries.map(([cur, amount]) => (
        <span key={cur} className={styles.balanceChip}>
          {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {cur}
        </span>
      ))}
    </div>
  );
}

const STATUS_TAG: Record<FileStatus, { intent: Intent; label: string }> = {
  pending: { intent: Intent.NONE, label: 'Pending' },
  uploading: { intent: Intent.PRIMARY, label: 'Importing...' },
  success: { intent: Intent.SUCCESS, label: 'Done' },
  error: { intent: Intent.DANGER, label: 'Failed' },
};

// ── Component ────────────────────────────────────────────────

export function ImportView() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const { importFile, invalidateAll } = useBankImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── File selection ───────────────────────────────────────

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const entries: FileEntry[] = Array.from(newFiles).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      // Reset input so re-selecting the same files works
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setCurrentIdx(-1);
  }, []);

  // ── Import all files sequentially ────────────────────────

  const handleImportAll = useCallback(async () => {
    setIsRunning(true);

    for (let i = 0; i < files.length; i++) {
      const entry = files[i]!;
      if (entry.status !== 'pending') continue;

      setCurrentIdx(i);

      // Mark as uploading
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f)),
      );

      try {
        const result = await importFile(entry.file);
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'success', result } : f,
          ),
        );
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || 'Import failed';
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: message } : f,
          ),
        );
      }
    }

    setCurrentIdx(-1);
    setIsRunning(false);
    invalidateAll();
  }, [files, importFile, invalidateAll]);

  // ── Derived state ────────────────────────────────────────

  const hasFiles = files.length > 0;
  const hasPending = files.some((f) => f.status === 'pending');
  const isDone = hasFiles && !isRunning && !hasPending;
  const succeeded = files.filter((f) => f.status === 'success');
  const failed = files.filter((f) => f.status === 'error');

  const totals = succeeded.reduce(
    (acc, f) => {
      acc.created += f.result!.created;
      acc.skipped += f.result!.skipped;
      acc.total += f.result!.totalTransactions;
      return acc;
    },
    { created: 0, skipped: 0, total: 0 },
  );

  // ── Render ───────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <PageHeader
        title="Import Bank Statements"
        actions={
          <Button
            minimal
            icon="history"
            onClick={() => router.push('/transactions/imports')}
          >
            Import History
          </Button>
        }
      />

      {/* Upload controls */}
      <div className={styles.uploadSection}>
        <label className="bp5-file-input">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleInputChange}
            disabled={isRunning}
          />
          <span className="bp5-file-upload-input">
            {hasFiles
              ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
              : 'Choose files (.xlsx, .xls)...'}
          </span>
        </label>

        {hasFiles && !isRunning && hasPending && (
          <Button
            intent={Intent.PRIMARY}
            icon="import"
            onClick={handleImportAll}
          >
            Import All ({files.filter((f) => f.status === 'pending').length}{' '}
            file{files.filter((f) => f.status === 'pending').length > 1 ? 's' : ''})
          </Button>
        )}

        {hasFiles && !isRunning && (
          <Button minimal icon="trash" onClick={clearAll}>
            Clear
          </Button>
        )}
      </div>

      {/* Progress bar while running */}
      {isRunning && (
        <div className={styles.progressHeader}>
          <Spinner size={16} />
          <span>
            Processing file {currentIdx + 1} of {files.length}...
          </span>
          <div className={styles.progressBarWrap}>
            <ProgressBar
              intent={Intent.PRIMARY}
              value={(currentIdx + 1) / files.length}
              animate
              stripes
            />
          </div>
        </div>
      )}

      {/* Aggregated summary when done */}
      {isDone && (
        <Callout
          intent={failed.length > 0 ? Intent.WARNING : Intent.SUCCESS}
          icon={failed.length > 0 ? 'warning-sign' : 'tick-circle'}
          title="Import Complete"
        >
          <div className={styles.summaryGrid}>
            <div>
              <div className={styles.summaryValue}>{succeeded.length}</div>
              <div className={styles.summaryLabel}>Files Imported</div>
            </div>
            {failed.length > 0 && (
              <div>
                <div className={styles.summaryValue}>{failed.length}</div>
                <div className={styles.summaryLabel}>Failed</div>
              </div>
            )}
            <div>
              <div className={styles.summaryValue}>
                {totals.created.toLocaleString()}
              </div>
              <div className={styles.summaryLabel}>Transactions Created</div>
            </div>
            <div>
              <div className={styles.summaryValue}>
                {totals.skipped.toLocaleString()}
              </div>
              <div className={styles.summaryLabel}>Duplicates Skipped</div>
            </div>
            <div>
              <div className={styles.summaryValue}>
                {totals.total.toLocaleString()}
              </div>
              <div className={styles.summaryLabel}>Total Processed</div>
            </div>
          </div>
        </Callout>
      )}

      {/* File list — shows as table (pre-import) or cards (during/after) */}
      {hasFiles && !isRunning && hasPending && !isDone && (
        <HTMLTable bordered striped className={styles.fileQueue}>
          <thead>
            <tr>
              <th>File</th>
              <th>Size</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {files.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.file.name}</td>
                <td className={styles.fileSize}>{fmtSize(entry.file.size)}</td>
                <td>
                  <Button
                    minimal
                    small
                    icon="cross"
                    className={styles.removeBtn}
                    onClick={() => removeFile(entry.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      )}

      {/* File cards — shown during and after import */}
      {(isRunning || isDone) && (
        <div className={styles.fileCards}>
          {files.map((entry) => (
            <FileCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-file card ────────────────────────────────────────────

function FileCard({ entry }: { entry: FileEntry }) {
  const [showSkipped, setShowSkipped] = useState(false);
  const tag = STATUS_TAG[entry.status];

  const statusClass =
    entry.status === 'uploading'
      ? styles.statusUploading
      : entry.status === 'success'
        ? styles.statusSuccess
        : entry.status === 'error'
          ? styles.statusError
          : '';

  const hasSkipped =
    entry.result &&
    entry.result.skippedDetails &&
    entry.result.skippedDetails.length > 0;

  return (
    <Card
      className={`${styles.fileCard} ${statusClass}`}
      elevation={0}
      compact
    >
      <div className={styles.fileCardHeader}>
        <span className={styles.fileName}>{entry.file.name}</span>
        <Tag
          intent={tag.intent}
          minimal
          icon={entry.status === 'uploading' ? <Spinner size={12} /> : undefined}
        >
          {tag.label}
        </Tag>
      </div>

      {/* Success metadata */}
      {entry.status === 'success' && entry.result && (
        <>
          <div className={styles.metaGrid}>
            <MetaItem label="Account" value={entry.result.accountIban} />
            <MetaItem label="Owner" value={entry.result.accountOwner} />
            <MetaItem
              label="Period"
              value={`${fmtDate(entry.result.periodFrom)} — ${fmtDate(entry.result.periodTo)}`}
            />
            <MetaItem
              label="Starting Balance"
              value={fmtBalance(entry.result.startingBalance)}
            />
            <MetaItem
              label="End Balance"
              value={fmtBalance(entry.result.endBalance)}
            />
          </div>

          <div className={styles.countsRow}>
            <span className={styles.countItem}>
              <span className={styles.countLabel}>Created:</span>
              <span className={`${styles.countValue} ${styles.countCreated}`}>
                {entry.result.created}
              </span>
            </span>
            <span className={styles.countItem}>
              <span className={styles.countLabel}>Skipped:</span>
              {hasSkipped ? (
                <Button
                  minimal
                  small
                  className={styles.countSkipped}
                  onClick={() => setShowSkipped((v) => !v)}
                  rightIcon={showSkipped ? 'chevron-up' : 'chevron-down'}
                >
                  {entry.result.skipped}
                </Button>
              ) : (
                <span className={`${styles.countValue} ${styles.countSkipped}`}>
                  {entry.result.skipped}
                </span>
              )}
            </span>
            <span className={styles.countItem}>
              <span className={styles.countLabel}>Total:</span>
              <span className={styles.countValue}>
                {entry.result.totalTransactions}
              </span>
            </span>
          </div>

          {/* Expandable skipped details */}
          {hasSkipped && (
            <Collapse isOpen={showSkipped}>
              <div className={styles.skippedSection}>
                <HTMLTable bordered striped compact className={styles.skippedTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Reason</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.result.skippedDetails.map((s, idx) => (
                      <tr key={idx}>
                        <td>{s.date}</td>
                        <td>
                          {parseFloat(s.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td>{s.currency}</td>
                        <td>
                          <Tag minimal intent={Intent.WARNING}>
                            {s.reason}
                          </Tag>
                        </td>
                        <td className={styles.skippedDetails} title={s.rawDetails}>
                          {s.rawDetails}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </HTMLTable>
              </div>
            </Collapse>
          )}
        </>
      )}

      {/* Error message */}
      {entry.status === 'error' && entry.error && (
        <div className={styles.errorText}>{entry.error}</div>
      )}
    </Card>
  );
}

// ── Small metadata row ───────────────────────────────────────

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}
