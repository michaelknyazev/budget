export interface BankStatementDetails {
  accountOwner: string;
  iban: string;
  cards: string[];
  periodFrom: Date;
  periodTo: Date;
  startingBalance: Record<string, number>;
  endBalance: Record<string, number>;
}

import { TransactionType, Currency } from '@budget/schemas';

export interface ParsedTransaction {
  date: Date;
  postingDate: Date;
  details: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  direction: 'inflow' | 'outflow';
  merchantName?: string | null;
  merchantLocation?: string | null;
  mccCode?: number | null;
  cardLastFour?: string | null;
}

export interface BankStatementParser {
  canParse(workbook: any): boolean;
  parseDetails(workbook: any): BankStatementDetails;
  parseTransactions(workbook: any): ParsedTransaction[];
}

export interface SkippedDetail {
  date: string;
  amount: string;
  currency: string;
  rawDetails: string;
  reason: string;
}

export interface ImportResult {
  bankImportId: string;
  created: number;
  skipped: number;
  totalTransactions: number;
  loanCostTotal: number;
  accountIban: string;
  accountOwner: string;
  periodFrom: string;
  periodTo: string;
  startingBalance: Record<string, number>;
  endBalance: Record<string, number>;
  skippedDetails: SkippedDetail[];
}
