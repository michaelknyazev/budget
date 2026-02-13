import * as XLSX from 'xlsx';
import {
  BankStatementParser,
  BankStatementDetails,
  ParsedTransaction,
} from '../types/parser.types';
import { TransactionType, Currency } from '@budget/schemas';

/**
 * Parser for Bank of Georgia savings/deposit account statements.
 * These use a different format from the main checking account statements:
 *  - Sheets: "Summary" + "Statement" (instead of "Details" + "Transactions")
 *  - Summary: account info in column B, single currency per file
 *  - Statement: 3 columns (Date, Purpose, amount), signed amounts, DD.MM.YYYY dates
 */
export class BankOfGeorgiaSavingsParser implements BankStatementParser {
  canParse(workbook: XLSX.WorkBook): boolean {
    const sheetNames = workbook.SheetNames;
    return sheetNames.includes('Summary') && sheetNames.includes('Statement');
  }

  parseDetails(workbook: XLSX.WorkBook): BankStatementDetails {
    const summarySheet = workbook.Sheets['Summary'];
    if (!summarySheet) {
      throw new Error('Summary sheet not found');
    }

    // Build a label→row map from column A
    const labelMap = new Map<string, number>();
    const range = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1:B20');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = summarySheet[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell?.v) {
        const label = String(cell.v).trim().toLowerCase().replace(/:$/, '');
        labelMap.set(label, r + 1); // 1-based row
      }
    }

    const ownerRow = labelMap.get('account holder') ?? 3;
    const accountOwner = this.getCellValue(summarySheet, `B${ownerRow}`) || '';

    const ibanRow = labelMap.get('account number') ?? 4;
    const iban = this.getCellValue(summarySheet, `B${ibanRow}`) || '';

    // No cards on savings/deposit accounts
    const cards: string[] = [];

    // Currency (e.g. "GEL", "USD")
    const currencyRow = labelMap.get('currency') ?? 6;
    const currencyStr =
      (this.getCellValue(summarySheet, `B${currencyRow}`) || 'GEL').trim();

    // Period dates (DD/MM/YYYY format in Summary)
    const dateFromRow = labelMap.get('filter date from') ?? 8;
    const dateToRow = labelMap.get('filter date to') ?? 9;
    const periodFrom = this.parseDate(
      this.getCellValue(summarySheet, `B${dateFromRow}`) || '',
    );
    const periodTo = this.parseDate(
      this.getCellValue(summarySheet, `B${dateToRow}`) || '',
    );

    // Starting and closing balances (e.g. " 0 GEL", " 39152.5 GEL")
    const startBalRow = labelMap.get('starting balance') ?? 11;
    const endBalRow = labelMap.get('closing balance') ?? 12;

    const startBalStr =
      this.getCellValue(summarySheet, `B${startBalRow}`) || '0';
    const endBalStr =
      this.getCellValue(summarySheet, `B${endBalRow}`) || '0';

    const startingBalance: Record<string, number> = {
      [currencyStr]: this.parseBalance(startBalStr),
    };
    const endBalance: Record<string, number> = {
      [currencyStr]: this.parseBalance(endBalStr),
    };

    return {
      accountOwner,
      iban,
      cards,
      periodFrom,
      periodTo,
      startingBalance,
      endBalance,
    };
  }

  parseTransactions(workbook: XLSX.WorkBook): ParsedTransaction[] {
    const statementSheet = workbook.Sheets['Statement'];
    if (!statementSheet) {
      throw new Error('Statement sheet not found');
    }

    // Read account owner and currency from Summary sheet
    const summarySheet = workbook.Sheets['Summary'];
    const accountOwner = summarySheet
      ? this.getCellValue(summarySheet, 'B3') || ''
      : '';

    // Detect currency from the header row of the Statement sheet
    const data = XLSX.utils.sheet_to_json(statementSheet, {
      header: 1,
      defval: null,
    }) as any[][];

    // Header row tells us the currency: ["Date", "Purpose", "GEL"] or ["Date", "Purpose", "USD"]
    const headerRow = data[0];
    let fileCurrency: Currency = Currency.GEL;
    if (headerRow && headerRow[2]) {
      const headerCur = String(headerRow[2]).trim().toUpperCase();
      if (headerCur in Currency) {
        fileCurrency = headerCur as Currency;
      }
    }

    const transactions: ParsedTransaction[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      const dateStr = String(row[0]);
      const details = String(row[1] || '').trim();
      const rawAmount = this.parseAmount(row[2]);

      if (rawAmount === null || rawAmount === 0) continue;

      const amount = Math.abs(rawAmount);
      const direction: 'inflow' | 'outflow' =
        rawAmount > 0 ? 'inflow' : 'outflow';

      const date = this.parseDate(dateStr);
      const type = this.classifyType(details, accountOwner);

      transactions.push({
        date,
        postingDate: date,
        details,
        amount,
        currency: fileCurrency,
        type,
        direction,
        merchantName: null,
        merchantLocation: null,
        mccCode: null,
        cardLastFour: null,
      });
    }

    return transactions;
  }

  // ── Classification (shared logic with main parser) ────────────

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

    // Default to EXPENSE
    return TransactionType.EXPENSE;
  }

  // ── Helpers ───────────────────────────────────────────────────

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

  private getCellValue(sheet: XLSX.WorkSheet, cell: string): string | null {
    const cellRef = sheet[cell];
    if (!cellRef || cellRef.v === undefined) {
      return null;
    }
    return String(cellRef.v);
  }

  private parseDate(dateStr: unknown): Date {
    if (dateStr instanceof Date) {
      return dateStr;
    }

    if (typeof dateStr === 'string') {
      // Handle DD.MM.YYYY format (dots — savings statements)
      const dotParts = dateStr.split('.');
      if (dotParts.length === 3) {
        const day = parseInt(dotParts[0]!, 10);
        const month = parseInt(dotParts[1]!, 10) - 1;
        const year = parseInt(dotParts[2]!, 10);
        return new Date(year, month, day);
      }

      // Handle DD/MM/YYYY format (slashes — summary sheet dates)
      const slashParts = dateStr.split('/');
      if (slashParts.length === 3) {
        const day = parseInt(slashParts[0]!, 10);
        const month = parseInt(slashParts[1]!, 10) - 1;
        const year = parseInt(slashParts[2]!, 10);
        return new Date(year, month, day);
      }

      // Try ISO
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    }

    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateStr - 2;
      return new Date(
        excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000,
      );
    }

    throw new Error(`Unable to parse date: ${dateStr}`);
  }

  private parseBalance(balanceStr: string): number {
    // Parse " 39152.5 GEL" or "0 USD" or "0.00GEL" format
    const match = balanceStr.match(/([\d.]+)/);
    if (match?.[1]) {
      return parseFloat(match[1]);
    }
    return 0;
  }

  private parseAmount(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }
}
