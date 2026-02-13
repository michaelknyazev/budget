import * as XLSX from 'xlsx';
import {
  BankStatementParser,
  BankStatementDetails,
  ParsedTransaction,
} from '../types/parser.types';
import { TransactionType, Currency } from '@budget/schemas';

/**
 * Parser for Bank of Georgia **business** account statements.
 *
 * Format:
 *  - Sheets: "Statement of Account" (transactions) + "Summary" (balances)
 *  - 37-column transaction rows with separate Debit/Credit columns
 *  - Dates are Excel serial numbers
 *  - Multi-currency per file (currency per row in column D)
 *  - Account N column includes currency suffix (e.g. "GE30BG...USD")
 *  - Entry Comment (col L) uses the same BoG detail format as personal statements
 */
export class BankOfGeorgiaBusinessParser implements BankStatementParser {
  // Column indices in "Statement of Account" (0-based)
  private static readonly COL_DATE = 0;
  private static readonly COL_ACCOUNT_N = 2;
  private static readonly COL_CURRENCY = 3;
  private static readonly COL_DEBIT = 6;
  private static readonly COL_CREDIT = 7;
  private static readonly COL_ENTRY_COMMENT = 11;
  private static readonly COL_SENDER_NAME = 15;
  private static readonly COL_RECIPIENT_NAME = 20;

  canParse(workbook: XLSX.WorkBook): boolean {
    const names = workbook.SheetNames;
    return (
      names.includes('Statement of Account') && names.includes('Summary')
    );
  }

  parseDetails(workbook: XLSX.WorkBook): BankStatementDetails {
    const stmtSheet = workbook.Sheets['Statement of Account']!;
    const summarySheet = workbook.Sheets['Summary']!;

    const stmtData = XLSX.utils.sheet_to_json(stmtSheet, {
      header: 1,
      defval: null,
    }) as any[][];

    // Row 1: [null, "Account Owner: ", "I/E MIKHAIL KNIAZEV", ...]
    const accountOwner = String(stmtData[1]?.[2] ?? '').trim();

    // Row 3: [null, "Period:  ", "01.01.2023-13.02.2026", ...]
    const periodStr = String(stmtData[3]?.[2] ?? '').trim();
    const { from: periodFrom, to: periodTo } = this.parsePeriod(periodStr);

    // IBAN from the first data row's Account N column, stripping currency suffix
    // e.g. "GE30BG0000000545804235USD" → "GE30BG0000000545804235"
    let iban = '';
    for (let i = 6; i < stmtData.length; i++) {
      const acctN = String(stmtData[i]?.[BankOfGeorgiaBusinessParser.COL_ACCOUNT_N] ?? '');
      if (acctN.startsWith('GE')) {
        iban = acctN.replace(/(USD|GEL|EUR|GBP|RUB)$/, '');
        break;
      }
    }

    // Summary sheet: starting from row 10, per-currency balances
    // Row 9 = header: Account N, Currency, Account Name, Beginning Balance, Ending Balance, ...
    const summaryData = XLSX.utils.sheet_to_json(summarySheet, {
      header: 1,
      defval: null,
    }) as any[][];

    const startingBalance: Record<string, number> = {};
    const endBalance: Record<string, number> = {};

    for (let i = 10; i < summaryData.length; i++) {
      const row = summaryData[i];
      if (!row || !row[1]) break; // stop when no more currency rows
      const cur = String(row[1]).trim(); // Currency column
      const beginBal = typeof row[3] === 'number' ? row[3] : 0;
      const endBal = typeof row[4] === 'number' ? row[4] : 0;
      if (cur) {
        startingBalance[cur] = beginBal;
        endBalance[cur] = endBal;
      }
    }

    return {
      accountOwner,
      iban,
      cards: [],
      periodFrom,
      periodTo,
      startingBalance,
      endBalance,
    };
  }

  parseTransactions(workbook: XLSX.WorkBook): ParsedTransaction[] {
    const stmtSheet = workbook.Sheets['Statement of Account']!;
    const data = XLSX.utils.sheet_to_json(stmtSheet, {
      header: 1,
      defval: null,
    }) as any[][];

    // Read account owner for transfer classification
    const accountOwner = String(data[1]?.[2] ?? '').trim();

    const transactions: ParsedTransaction[] = [];

    // Data rows start at index 6 (row 0 = title, 1-3 = meta, 4 = blank, 5 = header)
    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || row[0] === null) continue;

      const dateRaw = row[BankOfGeorgiaBusinessParser.COL_DATE];
      const currencyStr = String(
        row[BankOfGeorgiaBusinessParser.COL_CURRENCY] ?? '',
      ).trim();
      const debit = this.toNumber(row[BankOfGeorgiaBusinessParser.COL_DEBIT]);
      const credit = this.toNumber(row[BankOfGeorgiaBusinessParser.COL_CREDIT]);
      const details = String(
        row[BankOfGeorgiaBusinessParser.COL_ENTRY_COMMENT] ?? '',
      ).trim();

      // Validate currency
      if (!(currencyStr in Currency)) continue;
      const currency = currencyStr as Currency;

      // Determine amount and direction
      let amount: number;
      let direction: 'inflow' | 'outflow';
      if (credit !== null && credit > 0) {
        amount = credit;
        direction = 'inflow';
      } else if (debit !== null && debit > 0) {
        amount = debit;
        direction = 'outflow';
      } else {
        continue; // skip zero/null rows
      }

      const date = this.parseDate(dateRaw);
      const type = this.classifyType(details, accountOwner);

      // Extract merchant info from Entry Comment (same format as personal statements)
      const merchant = this.extractMerchant(details);

      transactions.push({
        date,
        postingDate: date,
        details,
        amount,
        currency,
        type,
        direction,
        merchantName: merchant.name || null,
        merchantLocation: merchant.location || null,
        mccCode: null, // business statements don't include MCC codes
        cardLastFour: null,
      });
    }

    return transactions;
  }

  // ── Classification (shared with other BoG parsers) ─────────

  private classifyType(
    details: string,
    accountOwner: string,
  ): TransactionType {
    const detailsLower = details.toLowerCase();

    if (detailsLower.includes('loan disbursement')) {
      return TransactionType.LOAN_DISBURSEMENT;
    }

    if (
      detailsLower.includes('loan repayment') &&
      detailsLower.includes('loan n')
    ) {
      return TransactionType.LOAN_REPAYMENT;
    }

    if (
      detailsLower.includes('repayment of interest') &&
      detailsLower.includes('loan n')
    ) {
      return TransactionType.LOAN_INTEREST;
    }

    if (detailsLower.includes('foreign exchange') || detailsLower.includes('automatic conversion')) {
      return TransactionType.FX_CONVERSION;
    }

    if (detailsLower.includes('placing funds on deposit') || detailsLower.includes('funds transfer from electronic till to the deposit')) {
      return TransactionType.DEPOSIT;
    }

    if (detailsLower.includes('plus points exchange')) {
      return TransactionType.TRANSFER;
    }

    if (detailsLower.includes('interest payment')) {
      return TransactionType.INTEREST_INCOME;
    }

    if (detailsLower.includes('credit funds')) {
      return TransactionType.INCOME;
    }

    // 'Between banks, instantly 24/7' = instant inter-bank transfer (e.g., TBC → BoG).
    // These are external incoming transfers (real income), NOT self-transfers.
    if (detailsLower.includes('between banks, instantly')) {
      return TransactionType.INCOME;
    }

    if (detailsLower.includes('cash deposit via payment machine')) {
      return TransactionType.INCOME;
    }

    if (
      detailsLower.includes('withdrawal - amount:') &&
      detailsLower.includes('atm:')
    ) {
      return TransactionType.ATM_WITHDRAWAL;
    }

    if (detailsLower.includes('maintenance fee')) {
      return TransactionType.FEE;
    }

    if (detailsLower.includes('cashback')) {
      return TransactionType.INCOME;
    }

    // Georgian: auto-debit cover / overdraft cover (internal bank transfers)
    if (detailsLower.includes('საინკასო დავალების') || detailsLower.includes('ოვერდრაფტის')) {
      return TransactionType.TRANSFER;
    }

    if (detailsLower.includes('money transfer received')) {
      return TransactionType.INCOME;
    }

    // Reversals and refunds are money coming back (income)
    if (detailsLower.includes('reversal') || detailsLower.includes('refund')) {
      return TransactionType.INCOME;
    }

    if (
      detailsLower.includes('payment - amount:') &&
      detailsLower.includes('merchant:')
    ) {
      return TransactionType.EXPENSE;
    }

    if (detailsLower.includes('outgoing transfer')) {
      const beneficiary = this.extractBeneficiary(details);
      if (beneficiary && !this.isSamePerson(beneficiary, accountOwner)) {
        return TransactionType.EXPENSE;
      }
      return TransactionType.TRANSFER;
    }

    if (detailsLower.includes('incoming transfer')) {
      const sender = this.extractSender(details);
      if (sender && this.isSamePerson(sender, accountOwner)) {
        return TransactionType.TRANSFER;
      }
      return TransactionType.INCOME;
    }

    return TransactionType.EXPENSE;
  }

  // ── Helpers ────────────────────────────────────────────────

  private extractBeneficiary(details: string): string | null {
    const match = details.match(/Beneficiary:\s*([^;]+)/i);
    return match?.[1]?.trim() || null;
  }

  private extractSender(details: string): string | null {
    const match = details.match(/Sender:\s*([^;]+)/i);
    return match?.[1]?.trim() || null;
  }

  private isSamePerson(name1: string, name2: string): boolean {
    if (!name1 || !name2) return false;

    const normalize = (n: string) =>
      n
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .sort();

    const parts1 = normalize(name1);
    const parts2 = normalize(name2);
    if (parts1.length === 0 || parts2.length === 0) return false;

    const [shorter, longer] =
      parts1.length <= parts2.length ? [parts1, parts2] : [parts2, parts1];
    return shorter.every((part) => longer.includes(part));
  }

  private extractMerchant(details: string): {
    name?: string;
    location?: string;
  } {
    const merchantMatch = details.match(
      /Merchant:\s*([^,]+)(?:,\s*([^;]+))?/i,
    );
    if (merchantMatch) {
      return {
        name: merchantMatch[1]?.trim(),
        location: merchantMatch[2]?.trim(),
      };
    }

    // For incoming transfers, use Sender from the details text
    const senderMatch = details.match(/Sender:\s*([^;]+)/i);
    if (senderMatch) {
      return { name: senderMatch[1]?.trim() };
    }

    return {};
  }

  private parseDate(value: unknown): Date {
    if (value instanceof Date) return value;

    // Excel serial date number
    if (typeof value === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = value - 2; // Excel treats 1900 as leap year
      return new Date(
        excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000,
      );
    }

    if (typeof value === 'string') {
      // DD.MM.YYYY
      const dotParts = value.split('.');
      if (dotParts.length === 3) {
        return new Date(
          parseInt(dotParts[2]!, 10),
          parseInt(dotParts[1]!, 10) - 1,
          parseInt(dotParts[0]!, 10),
        );
      }

      // DD/MM/YYYY
      const slashParts = value.split('/');
      if (slashParts.length === 3) {
        return new Date(
          parseInt(slashParts[2]!, 10),
          parseInt(slashParts[1]!, 10) - 1,
          parseInt(slashParts[0]!, 10),
        );
      }

      const iso = new Date(value);
      if (!isNaN(iso.getTime())) return iso;
    }

    throw new Error(`Unable to parse date: ${value}`);
  }

  /** Parse "DD.MM.YYYY-DD.MM.YYYY" period string */
  private parsePeriod(period: string): { from: Date; to: Date } {
    const [fromStr, toStr] = period.split('-');
    if (!fromStr || !toStr) {
      throw new Error(`Unable to parse period: ${period}`);
    }

    const parsePart = (s: string) => {
      const parts = s.trim().split('.');
      if (parts.length !== 3) throw new Error(`Unable to parse date: ${s}`);
      return new Date(
        parseInt(parts[2]!, 10),
        parseInt(parts[1]!, 10) - 1,
        parseInt(parts[0]!, 10),
      );
    };

    return { from: parsePart(fromStr), to: parsePart(toStr) };
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
}
