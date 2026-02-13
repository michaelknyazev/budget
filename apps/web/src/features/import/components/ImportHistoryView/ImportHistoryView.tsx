'use client';

import { useState } from 'react';
import {
  Button,
  HTMLTable,
  Icon,
  NonIdealState,
  Spinner,
  Tag,
  Intent,
  Collapse,
} from '@blueprintjs/core';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { useImportHistory, useSkippedTransactions } from '../../hooks/use-import-history';
import type { ImportHistoryItem } from '@budget/schemas';
import styles from './ImportHistoryView.module.scss';

// ── Helpers ──────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtBalance(balance: Record<string, number>): React.ReactNode {
  const entries = Object.entries(balance).filter(([, v]) => v !== 0);
  if (entries.length === 0) return <span className={styles.muted}>0</span>;
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

// ── Component ────────────────────────────────────────────────

export function ImportHistoryView() {
  const router = useRouter();
  const { data: imports, isLoading } = useImportHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <PageHeader
          title="Import History"
          actions={
            <Button icon="import" onClick={() => router.push('/transactions/import')}>
              New Import
            </Button>
          }
        />
        <Spinner />
      </div>
    );
  }

  if (!imports || imports.length === 0) {
    return (
      <div className={styles.container}>
        <PageHeader
          title="Import History"
          actions={
            <Button icon="import" onClick={() => router.push('/transactions/import')}>
              New Import
            </Button>
          }
        />
        <NonIdealState
          icon="inbox"
          title="No imports yet"
          description="Import a bank statement to get started."
          action={
            <Button
              intent={Intent.PRIMARY}
              icon="import"
              onClick={() => router.push('/transactions/import')}
            >
              Import Statement
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Import History"
        actions={
          <Button icon="import" onClick={() => router.push('/transactions/import')}>
            New Import
          </Button>
        }
      />

      <div className={styles.tableWrap}>
        <HTMLTable bordered striped className={styles.table}>
          <thead>
            <tr>
              <th />
              <th>Imported</th>
              <th>File</th>
              <th>Account</th>
              <th>Period</th>
              <th>Starting Balance</th>
              <th>End Balance</th>
              <th>Created</th>
              <th>Skipped</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <ImportRow
                key={imp.id}
                imp={imp}
                isExpanded={expandedId === imp.id}
                onToggle={() => toggleExpanded(imp.id)}
              />
            ))}
          </tbody>
        </HTMLTable>
      </div>
    </div>
  );
}

// ── Per-import row with expandable skipped section ────────────

function ImportRow({
  imp,
  isExpanded,
  onToggle,
}: {
  imp: ImportHistoryItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasSkipped = imp.skipped > 0;

  return (
    <>
      <tr
        className={hasSkipped ? styles.clickableRow : undefined}
        onClick={hasSkipped ? onToggle : undefined}
      >
        <td style={{ width: 28 }}>
          {hasSkipped && (
            <Icon icon={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} />
          )}
        </td>
        <td>{fmtDateTime(imp.importedAt)}</td>
        <td>{imp.fileName}</td>
        <td>
          <div>{imp.accountIban}</div>
          <div className={styles.muted}>{imp.accountOwner}</div>
        </td>
        <td>
          {fmtDate(imp.periodFrom)} — {fmtDate(imp.periodTo)}
        </td>
        <td>{fmtBalance(imp.startingBalance)}</td>
        <td>{fmtBalance(imp.endBalance)}</td>
        <td>
          <span className={styles.countCreated}>{imp.created}</span>
        </td>
        <td>
          {imp.skipped > 0 ? (
            <span className={styles.countSkipped}>{imp.skipped}</span>
          ) : (
            <span className={styles.muted}>0</span>
          )}
        </td>
        <td>{imp.transactionCount}</td>
      </tr>

      {hasSkipped && (
        <tr>
          <td colSpan={10} style={{ padding: 0, border: 'none' }}>
            <Collapse isOpen={isExpanded}>
              <SkippedSection importId={imp.id} />
            </Collapse>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Skipped transactions detail panel ────────────────────────

function SkippedSection({ importId }: { importId: string }) {
  const { data: skipped, isLoading } = useSkippedTransactions(importId);

  if (isLoading) {
    return (
      <div className={styles.skippedSection}>
        <Spinner size={20} />
      </div>
    );
  }

  if (!skipped || skipped.length === 0) {
    return (
      <div className={styles.skippedSection}>
        <p className={styles.muted}>No skipped transaction details found.</p>
      </div>
    );
  }

  return (
    <div className={styles.skippedSection}>
      <div className={styles.skippedHeader}>
        <h4>Skipped Transactions ({skipped.length})</h4>
      </div>
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
          {skipped.map((s) => (
            <tr key={s.id}>
              <td>{fmtDate(s.date)}</td>
              <td>{parseFloat(s.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td>{s.currency}</td>
              <td>
                <Tag minimal intent={Intent.WARNING}>
                  {s.reason}
                </Tag>
              </td>
              <td className={styles.rawDetails} title={s.rawDetails}>
                {s.rawDetails}
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    </div>
  );
}
