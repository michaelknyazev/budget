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

    // Read account owner at C2
    const accountOwner = this.getCellValue(detailsSheet, 'C2') || '';

    // Read IBAN at C3
    const iban = this.getCellValue(detailsSheet, 'C3') || '';

    // Read cards at C4-C6
    const cards: string[] = [];
    for (let row = 4; row <= 6; row++) {
      const card = this.getCellValue(detailsSheet, `C${row}`);
      if (card) {
        cards.push(card);
      }
    }

    // Read dates at C7-C8 (format DD/MM/YYYY)
    const periodFromStr = this.getCellValue(detailsSheet, 'C7') || '';
    const periodToStr = this.getCellValue(detailsSheet, 'C8') || '';

    const periodFrom = this.parseDate(periodFromStr);
    const periodTo = this.parseDate(periodToStr);

    // Read balances at C9-C16 (parse "1854.85GEL" format)
    const startingBalance: Record<string, number> = {};
    const endBalance: Record<string, number> = {};

    // Starting balances: C9-C12 (GEL, USD, EUR, GBP)
    const currencies = ['GEL', 'USD', 'EUR', 'GBP'];
    for (let i = 0; i < currencies.length; i++) {
      const cellValue = this.getCellValue(detailsSheet, `C${9 + i}`);
      const cur = currencies[i]!;
      if (cellValue) {
        startingBalance[cur] = this.parseBalance(cellValue);
      }
    }

    // End balances: C13-C16 (GEL, USD, EUR, GBP)
    for (let i = 0; i < currencies.length; i++) {
      const cellValue = this.getCellValue(detailsSheet, `C${13 + i}`);
      const cur = currencies[i]!;
      if (cellValue) {
        endBalance[cur] = this.parseBalance(cellValue);
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

      // Determine currency and amount from non-null/non-zero amount columns
      let currency: Currency | null = null;
      let amount = 0;

      if (gelAmount !== null && gelAmount !== 0) {
        currency = Currency.GEL;
        amount = Math.abs(gelAmount);
      } else if (usdAmount !== null && usdAmount !== 0) {
        currency = Currency.USD;
        amount = Math.abs(usdAmount);
      } else if (eurAmount !== null && eurAmount !== 0) {
        currency = Currency.EUR;
        amount = Math.abs(eurAmount);
      } else if (gbpAmount !== null && gbpAmount !== 0) {
        currency = Currency.GBP;
        amount = Math.abs(gbpAmount);
      }

      // Skip if no valid amount found
      if (!currency || amount === 0) {
        continue;
      }

      // TypeScript: currency is now guaranteed to be Currency, not null
      const finalCurrency = currency;

      // Parse date
      const date = this.parseDate(dateStr);
      const postingDate = date; // Use same date for posting date

      // Classify transaction type
      const type = this.classifyType(details);

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
        merchantName: merchant.name || null,
        merchantLocation: merchant.location || null,
        mccCode: mccCode || null,
        cardLastFour: cardLastFour || null,
      });
    }

    return transactions;
  }

  private classifyType(details: string): TransactionType {
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

    if (detailsLower.includes('foreign exchange')) {
      return TransactionType.FX_CONVERSION;
    }

    if (detailsLower.includes('placing funds on deposit')) {
      return TransactionType.DEPOSIT;
    }

    if (detailsLower.includes('interest payment')) {
      return TransactionType.INTEREST_INCOME;
    }

    if (detailsLower.includes('credit funds')) {
      return TransactionType.INCOME;
    }

    if (detailsLower.includes('between banks, instantly')) {
      return TransactionType.TRANSFER;
    }

    if (detailsLower.includes('cash deposit via payment machine')) {
      return TransactionType.INCOME;
    }

    if (detailsLower.includes('withdrawal - amount:') && detailsLower.includes('atm:')) {
      return TransactionType.ATM_WITHDRAWAL;
    }

    if (detailsLower.includes('solo internatioanl package maintenance fee')) {
      return TransactionType.FEE;
    }

    if (detailsLower.includes('payment - amount:') && detailsLower.includes('merchant:')) {
      return TransactionType.EXPENSE;
    }

    if (detailsLower.includes('outgoing transfer')) {
      return TransactionType.TRANSFER;
    }

    if (detailsLower.includes('incoming transfer')) {
      return TransactionType.INCOME;
    }

    // Default to EXPENSE
    return TransactionType.EXPENSE;
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
