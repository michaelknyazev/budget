import * as XLSX from 'xlsx';
import {
  BankStatementParser,
  BankStatementDetails,
  ParsedTransaction,
} from '../types/parser.types';
import { TransactionType, Currency } from '@budget/schemas';

export class BankOfGeorgiaParser implements BankStatementParser {
  canParse(workbook: XLSX.WorkBook): boolean {
    const sheetNames = workbook.SheetNames;
    return sheetNames.includes('Details') && sheetNames.includes('Transactions');
  }

  parseDetails(workbook: XLSX.WorkBook): BankStatementDetails {
    const detailsSheet = workbook.Sheets['Details'];
    if (!detailsSheet) {
      throw new Error('Details sheet not found');
    }

    // Build a label→row map from column A so we don't rely on fixed row positions.
    // Different BoG statements may have varying numbers of card rows, shifting
    // dates and balances up or down.
    const labelMap = new Map<string, number>(); // normalized label → row number
    const range = XLSX.utils.decode_range(detailsSheet['!ref'] || 'A1:C20');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = detailsSheet[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell?.v) {
        const label = String(cell.v).trim().toLowerCase().replace(/:$/, '');
        labelMap.set(label, r + 1); // store as 1-based row
      }
    }

    // Account owner (row labeled "Account Owner" or fallback to C2)
    const ownerRow = labelMap.get('account owner') ?? 2;
    const accountOwner = this.getCellValue(detailsSheet, `C${ownerRow}`) || '';

    // IBAN (row labeled "Account No" or fallback to C3)
    const ibanRow = labelMap.get('account no') ?? 3;
    const iban = this.getCellValue(detailsSheet, `C${ibanRow}`) || '';

    // Cards — read rows between the IBAN row and the date-from row
    const cards: string[] = [];
    const cardRow = labelMap.get('card') ?? (ibanRow + 1);
    const dateFromRow =
      labelMap.get('filter date from') ?? labelMap.get('date from') ?? (cardRow + 1);
    for (let row = cardRow; row < dateFromRow; row++) {
      const card = this.getCellValue(detailsSheet, `C${row}`);
      if (card) {
        cards.push(card);
      }
    }

    // Period dates — look for labelled rows, fall back to old positions
    const dateToRow =
      labelMap.get('filter date to') ?? labelMap.get('date to') ?? (dateFromRow + 1);
    const periodFromStr = this.getCellValue(detailsSheet, `C${dateFromRow}`) || '';
    const periodToStr = this.getCellValue(detailsSheet, `C${dateToRow}`) || '';

    const periodFrom = this.parseDate(periodFromStr);
    const periodTo = this.parseDate(periodToStr);

    // Balances — find "Starting Balance" and "End Balance" label rows,
    // then read 4 consecutive currency rows (GEL, USD, EUR, GBP) from column C.
    const startingBalanceRow =
      labelMap.get('starting balance') ?? (dateToRow + 1);
    const endBalanceRow =
      labelMap.get('end balance') ?? (startingBalanceRow + 4);

    const startingBalance: Record<string, number> = {};
    const endBalance: Record<string, number> = {};
    const currencies = ['GEL', 'USD', 'EUR', 'GBP'];

    for (let i = 0; i < currencies.length; i++) {
      const cur = currencies[i]!;
      const startVal = this.getCellValue(detailsSheet, `C${startingBalanceRow + i}`);
      if (startVal) {
        startingBalance[cur] = this.parseBalance(startVal);
      }
      const endVal = this.getCellValue(detailsSheet, `C${endBalanceRow + i}`);
      if (endVal) {
        endBalance[cur] = this.parseBalance(endVal);
      }
    }

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
    const transactionsSheet = workbook.Sheets['Transactions'];
    if (!transactionsSheet) {
      throw new Error('Transactions sheet not found');
    }

    // Read account owner from Details sheet for transfer classification
    const detailsSheet = workbook.Sheets['Details'];
    const accountOwner = detailsSheet
      ? this.getCellValue(detailsSheet, 'C2') || ''
      : '';

    const data = XLSX.utils.sheet_to_json(transactionsSheet, {
      header: 1,
      defval: null,
    }) as any[][];

    const transactions: ParsedTransaction[] = [];

    // Skip header row (index 0) and process data rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i]!;

      // Skip "Balance" rows (where A cell value is "Balance")
      if (!row || row[0] === 'Balance' || row[0] === null) {
        continue;
      }

      // Columns: A=date, B=details, D=GEL, E=USD, F=EUR, G=GBP
      const dateStr = row[0] as string;
      const details = (row[1] as string) || '';
      const gelAmount = this.parseAmount(row[3]);
      const usdAmount = this.parseAmount(row[4]);
      const eurAmount = this.parseAmount(row[5]);
      const gbpAmount = this.parseAmount(row[6]);

      // Determine currency, amount, and direction from non-null/non-zero amount columns
      let currency: Currency | null = null;
      let rawAmount = 0;

      if (gelAmount !== null && gelAmount !== 0) {
        currency = Currency.GEL;
        rawAmount = gelAmount;
      } else if (usdAmount !== null && usdAmount !== 0) {
        currency = Currency.USD;
        rawAmount = usdAmount;
      } else if (eurAmount !== null && eurAmount !== 0) {
        currency = Currency.EUR;
        rawAmount = eurAmount;
      } else if (gbpAmount !== null && gbpAmount !== 0) {
        currency = Currency.GBP;
        rawAmount = gbpAmount;
      }

      // Skip if no valid amount found
      if (!currency || rawAmount === 0) {
        continue;
      }

      const amount = Math.abs(rawAmount);
      // Positive raw amount = money coming in; negative = money going out
      const direction: 'inflow' | 'outflow' = rawAmount > 0 ? 'inflow' : 'outflow';

      // TypeScript: currency is now guaranteed to be Currency, not null
      const finalCurrency = currency;

      // Parse date
      const date = this.parseDate(dateStr);
      const postingDate = date; // Use same date for posting date

      // Classify transaction type
      const type = this.classifyType(details, accountOwner);

      // Extract merchant info
      const merchant = this.extractMerchant(details);

      // Extract MCC code
      const mccCode = this.extractMccCode(details);

      // Extract card number
      const cardLastFour = this.extractCardNumber(details);

      transactions.push({
        date,
        postingDate,
        details,
        amount,
        currency: finalCurrency,
        type,
        direction,
        merchantName: merchant.name || null,
        merchantLocation: merchant.location || null,
        mccCode: mccCode || null,
        cardLastFour: cardLastFour || null,
      });
    }

    return transactions;
  }

  private classifyType(details: string, accountOwner: string): TransactionType {
    const detailsLower = details.toLowerCase();

    if (detailsLower.includes('loan disbursement')) {
      return TransactionType.LOAN_DISBURSEMENT;
    }

    if (detailsLower.includes('loan repayment') && detailsLower.includes('loan n')) {
      return TransactionType.LOAN_REPAYMENT;
    }

    if (detailsLower.includes('repayment of interest') && detailsLower.includes('loan n')) {
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

    if (detailsLower.includes('withdrawal - amount:') && detailsLower.includes('atm:')) {
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

    if (detailsLower.includes('payment - amount:') && detailsLower.includes('merchant:')) {
      return TransactionType.EXPENSE;
    }

    if (detailsLower.includes('outgoing transfer')) {
      // Distinguish self-transfers (inter-account) from payments to others
      const beneficiary = this.extractBeneficiary(details);
      if (beneficiary && !this.isSamePerson(beneficiary, accountOwner)) {
        return TransactionType.EXPENSE;
      }
      return TransactionType.TRANSFER;
    }

    if (detailsLower.includes('incoming transfer')) {
      // Distinguish inter-account transfers from real external income
      const sender = this.extractSender(details);
      if (sender && this.isSamePerson(sender, accountOwner)) {
        return TransactionType.TRANSFER;
      }
      return TransactionType.INCOME;
    }

    // Default to EXPENSE
    return TransactionType.EXPENSE;
  }

  /**
   * Extract the beneficiary name from an outgoing transfer detail string.
   * Format: "Outgoing Transfer - Amount: GEL10,000.00; Beneficiary: kniazeva mariia; Account: ..."
   */
  private extractBeneficiary(details: string): string | null {
    const match = details.match(/Beneficiary:\s*([^;]+)/i);
    return match?.[1]?.trim() || null;
  }

  private extractSender(details: string): string | null {
    const match = details.match(/Sender:\s*([^;]+)/i);
    return match?.[1]?.trim() || null;
  }

  /**
   * Compare two person names, ignoring case and word order.
   * Returns true if all parts of one name appear in the other.
   * e.g. "Mikhail Kniazev" matches "kniazev mikhail"
   */
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

    // Check if all parts of the shorter name appear in the longer name
    const [shorter, longer] =
      parts1.length <= parts2.length ? [parts1, parts2] : [parts2, parts1];

    return shorter.every((part) => longer.includes(part));
  }

  private extractMerchant(details: string): { name?: string; location?: string } {
    const merchantMatch = details.match(/Merchant:\s*([^,]+)(?:,\s*([^;]+))?/i);
    if (merchantMatch) {
      return {
        name: merchantMatch[1]?.trim(),
        location: merchantMatch[2]?.trim(),
      };
    }
    return {};
  }

  private extractMccCode(details: string): number | null {
    const mccMatch = details.match(/MCC:\s*(\d+)/i);
    if (mccMatch?.[1]) {
      return parseInt(mccMatch[1], 10);
    }
    return null;
  }

  private extractCardNumber(details: string): string | null {
    const cardMatch = details.match(/Card No:\s*\*\*\*\*(\d{4})/i);
    if (cardMatch?.[1]) {
      return cardMatch[1];
    }
    return null;
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
      // Handle DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]!, 10);
        const month = parseInt(parts[1]!, 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]!, 10);
        return new Date(year, month, day);
      }

      // Try parsing as ISO date
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    }

    // If it's a number (Excel serial date), convert it
    if (typeof dateStr === 'number') {
      // Excel epoch is January 1, 1900
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateStr - 2; // Excel has a bug: it treats 1900 as a leap year
      return new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
    }

    throw new Error(`Unable to parse date: ${dateStr}`);
  }

  private parseBalance(balanceStr: string): number {
    // Parse "1854.85GEL" format
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
