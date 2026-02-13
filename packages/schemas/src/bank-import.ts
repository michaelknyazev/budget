import { z } from 'zod';
import { CurrencyEnum } from './enums';

// ── Skipped transaction detail (returned inline with import result) ───

export const SkippedDetailSchema = z.object({
  date: z.string(),
  amount: z.string(),
  currency: z.string(),
  rawDetails: z.string(),
  reason: z.string(),
});

export type SkippedDetail = z.infer<typeof SkippedDetailSchema>;

// ── Import result (returned immediately after upload) ─────────────────

export const ImportResultSchema = z.object({
  bankImportId: z.string(),
  created: z.number(),
  skipped: z.number(),
  totalTransactions: z.number(),
  loanCostTotal: z.number(),
  accountIban: z.string(),
  accountOwner: z.string(),
  periodFrom: z.string(),
  periodTo: z.string(),
  startingBalance: z.record(z.string(), z.number()),
  endBalance: z.record(z.string(), z.number()),
  skippedDetails: z.array(SkippedDetailSchema),
});

export type ImportResult = z.infer<typeof ImportResultSchema>;

// ── Import history list item (GET /bank-import) ───────────────────────

export const ImportHistoryItemSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  accountIban: z.string(),
  accountOwner: z.string(),
  periodFrom: z.string(),
  periodTo: z.string(),
  startingBalance: z.record(z.string(), z.number()),
  endBalance: z.record(z.string(), z.number()),
  transactionCount: z.number(),
  created: z.number(),
  skipped: z.number(),
  importedAt: z.string(),
});

export type ImportHistoryItem = z.infer<typeof ImportHistoryItemSchema>;

// ── Skipped transaction record (GET /bank-import/:id/skipped-transactions)

export const SkippedTransactionRecordSchema = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.string(),
  currency: CurrencyEnum,
  rawDetails: z.string(),
  reason: z.string(),
  importHash: z.string(),
  existingTransactionId: z.string().nullable(),
});

export type SkippedTransactionRecord = z.infer<typeof SkippedTransactionRecordSchema>;
