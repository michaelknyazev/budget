import { z } from 'zod';

export enum Currency {
  USD = 'USD',
  GEL = 'GEL',
  RUB = 'RUB',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  LOAN_INTEREST = 'LOAN_INTEREST',
  FX_CONVERSION = 'FX_CONVERSION',
  DEPOSIT = 'DEPOSIT',
  FEE = 'FEE',
  ATM_WITHDRAWAL = 'ATM_WITHDRAWAL',
  INTEREST_INCOME = 'INTEREST_INCOME',
}

export enum CategoryType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  ANY = 'ANY',
}

export enum AccountType {
  CHECKING = 'CHECKING',
  DEPOSIT = 'DEPOSIT',
  SAVINGS = 'SAVINGS',
}

export enum ExchangeRateSource {
  NBG_API = 'NBG_API',
  MANUAL = 'MANUAL',
  BANK_STATEMENT = 'BANK_STATEMENT',
}

// Zod schemas for runtime validation
export const CurrencyEnum = z.enum(['USD', 'GEL', 'RUB', 'EUR', 'GBP']);
export const TransactionTypeEnum = z.enum([
  'EXPENSE',
  'INCOME',
  'TRANSFER',
  'LOAN_DISBURSEMENT',
  'LOAN_REPAYMENT',
  'LOAN_INTEREST',
  'FX_CONVERSION',
  'DEPOSIT',
  'FEE',
  'ATM_WITHDRAWAL',
  'INTEREST_INCOME',
]);
export const CategoryTypeEnum = z.enum(['EXPENSE', 'INCOME', 'ANY']);
export const AccountTypeEnum = z.enum(['CHECKING', 'DEPOSIT', 'SAVINGS']);
export const ExchangeRateSourceEnum = z.enum([
  'NBG_API',
  'MANUAL',
  'BANK_STATEMENT',
]);

/** Financial reporting groups */
export const REAL_INCOME_TYPES: TransactionType[] = [
  TransactionType.INCOME,
  TransactionType.INTEREST_INCOME,
];

export const REAL_EXPENSE_TYPES: TransactionType[] = [
  TransactionType.EXPENSE,
  TransactionType.FEE,
  TransactionType.ATM_WITHDRAWAL,
];

export const LOAN_COST_TYPES: TransactionType[] = [
  TransactionType.LOAN_INTEREST,
];

export const FINANCING_NOISE_TYPES: TransactionType[] = [
  TransactionType.TRANSFER,
  TransactionType.LOAN_DISBURSEMENT,
  TransactionType.LOAN_REPAYMENT,
  TransactionType.FX_CONVERSION,
  TransactionType.DEPOSIT,
];

/** Direction groups — used for display (+ / -) */
export const INFLOW_TYPES: TransactionType[] = [
  TransactionType.INCOME,
  TransactionType.INTEREST_INCOME,
  TransactionType.LOAN_DISBURSEMENT,
];

export const OUTFLOW_TYPES: TransactionType[] = [
  TransactionType.EXPENSE,
  TransactionType.FEE,
  TransactionType.ATM_WITHDRAWAL,
  TransactionType.LOAN_REPAYMENT,
  TransactionType.LOAN_INTEREST,
  TransactionType.DEPOSIT,
];
// TRANSFER and FX_CONVERSION are direction-ambiguous (default to outflow in display)
