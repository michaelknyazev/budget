import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { BankImport } from '@/bank-import/entities/bank-import.entity';
import { ExchangeRateService } from '@/exchange-rate/services/exchange-rate.service';
import { SubscriptionService } from '@/subscription/services/subscription.service';
import { LoanService } from '@/loan/services/loan.service';
import { PlannedIncomeService } from '@/planned-income/services/planned-income.service';
import { BudgetTargetService } from '@/budget-target/services/budget-target.service';
import {
  Currency,
  REAL_INCOME_TYPES,
  REAL_EXPENSE_TYPES,
  LOAN_COST_TYPES,
  TransactionType,
} from '@budget/schemas';
import type {
  YearlySummaryResponse,
  YearlyMonthData,
  MonthlyReportResponse,
} from '@budget/schemas';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly subscriptionService: SubscriptionService,
    private readonly loanService: LoanService,
    private readonly plannedIncomeService: PlannedIncomeService,
    private readonly budgetTargetService: BudgetTargetService,
  ) {}

  // ────────────────────────────────────────────────────────────────
  // Monthly Summary (existing, now with currency conversion)
  // ────────────────────────────────────────────────────────────────

  async getMonthlySummary(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ) {
    const { startDate, endDate } = this.getMonthRange(month, year);

    const transactions = await this.em.find(
      Transaction,
      {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
      },
      { populate: ['category'] },
    );

    let grossIncome = 0;
    let totalExpenses = 0;
    let loanCost = 0;
    const categoryTotals = new Map<string, { name: string; amount: number }>();

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const amount = await this.convert(
        rawAmount,
        transaction.currency,
        displayCurrency,
        transaction.date,
      );

      if (REAL_INCOME_TYPES.includes(type)) {
        grossIncome += amount;
      }

      if (REAL_EXPENSE_TYPES.includes(type)) {
        totalExpenses += amount;
      }

      if (LOAN_COST_TYPES.includes(type)) {
        loanCost += amount;
      }

      if (REAL_EXPENSE_TYPES.includes(type) && transaction.category) {
        const categoryId = transaction.category.id;
        const existing = categoryTotals.get(categoryId) || {
          name: transaction.category.name,
          amount: 0,
        };
        existing.amount += amount;
        categoryTotals.set(categoryId, existing);
      }
    }

    const netIncome = grossIncome - totalExpenses - loanCost;

    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const depositBalance = this.round(
      await this.computeDepositBalance(userId, displayCurrency, new Date(year, month - 1, 15)),
    );

    return {
      grossIncome: this.round(grossIncome),
      totalExpenses: this.round(totalExpenses),
      loanCost: this.round(loanCost),
      netIncome: this.round(netIncome),
      transactionCount: transactions.length,
      topCategories: topCategories.map((c) => ({
        name: c.name,
        amount: this.round(c.amount),
      })),
      depositBalance,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Yearly Summary
  // ────────────────────────────────────────────────────────────────

  async getYearlySummary(
    userId: string,
    year: number,
    displayCurrency: string,
  ): Promise<YearlySummaryResponse> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Fetch actual transactions (with linked exchange rates),
    // planned income, and budget targets in parallel
    const [transactions, plannedIncomeItems, allBudgetTargets] =
      await Promise.all([
        this.em.find(
          Transaction,
          { user: userId, date: { $gte: startDate, $lte: endDate } },
          { populate: ['exchangeRate'] },
        ),
        this.plannedIncomeService.findAll(userId, year),
        this.budgetTargetService.findAll(userId),
      ]);

    // Filter budget targets to this year's EXPENSE targets
    const expenseTargets = allBudgetTargets.filter(
      (t) => t.year === year && t.type === 'EXPENSE',
    );

    // Initialize 12 month buckets
    const monthBuckets: Array<{
      grossIncome: number;
      totalExpenses: number;
      loanCost: number;
      fxCost: number;
      plannedIncome: number;
      plannedExpenses: number;
      expensesByCurrency: Record<string, number>;
    }> = Array.from({ length: 12 }, () => ({
      grossIncome: 0,
      totalExpenses: 0,
      loanCost: 0,
      fxCost: 0,
      plannedIncome: 0,
      plannedExpenses: 0,
      expensesByCurrency: {
        USD: 0,
        GEL: 0,
        RUB: 0,
        EUR: 0,
        GBP: 0,
      },
    }));

    // Aggregate actual transactions
    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const txDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
      const monthIdx = txDate.getMonth(); // 0-based

      const convertedAmount = await this.convertTx(
        rawAmount,
        transaction.currency,
        displayCurrency,
        txDate,
        transaction.exchangeRate,
      );

      const bucket = monthBuckets[monthIdx];
      if (!bucket) continue;

      if (REAL_INCOME_TYPES.includes(type)) {
        bucket.grossIncome += convertedAmount;
      }

      if (REAL_EXPENSE_TYPES.includes(type)) {
        bucket.totalExpenses += convertedAmount;
        // Track in original currency
        const cur = transaction.currency as string;
        if (cur in bucket.expensesByCurrency) {
          bucket.expensesByCurrency[cur] =
            (bucket.expensesByCurrency[cur] ?? 0) + rawAmount;
        }
      }

      if (LOAN_COST_TYPES.includes(type)) {
        bucket.loanCost += convertedAmount;
      }

      // FX conversion net flow: captures the real cost of currency exchange.
      // Inflows minus outflows in display currency. Negative = spread loss.
      if (type === TransactionType.FX_CONVERSION) {
        const direction = (transaction.metadata as Record<string, unknown>)?.direction;
        if (direction === 'inflow') {
          bucket.fxCost += convertedAmount;
        } else {
          bucket.fxCost -= convertedAmount;
        }
      }
    }

    // Aggregate planned income per month
    for (const planned of plannedIncomeItems) {
      const monthIdx = planned.month - 1; // 0-based
      const bucket = monthBuckets[monthIdx];
      if (!bucket) continue;

      const plannedAmount = parseFloat(planned.plannedAmount);
      const sourceCurrency = planned.incomeSource.currency;
      const midDate = new Date(year, monthIdx, 15);

      const convertedPlanned = await this.convert(
        plannedAmount,
        sourceCurrency,
        displayCurrency,
        midDate,
      );
      bucket.plannedIncome += convertedPlanned;
    }

    // Aggregate planned expenses (budget targets) per month
    for (const target of expenseTargets) {
      const monthIdx = target.month - 1; // 0-based
      const bucket = monthBuckets[monthIdx];
      if (!bucket) continue;

      const targetAmount = parseFloat(target.targetAmount);
      const midDate = new Date(year, monthIdx, 15);

      const convertedTarget = await this.convert(
        targetAmount,
        target.currency,
        displayCurrency,
        midDate,
      );
      bucket.plannedExpenses += convertedTarget;
    }

    const months: YearlyMonthData[] = monthBuckets.map((bucket, idx) => {
      // netIncome includes FX conversion cost — the real spread loss from
      // currency conversions. Without this, multi-currency portfolios
      // overstate savings by the cumulative bank spread.
      const netIncome =
        bucket.grossIncome - bucket.totalExpenses - bucket.loanCost + bucket.fxCost;
      const plannedNetIncome =
        bucket.plannedIncome - bucket.plannedExpenses;
      return {
        month: idx + 1,
        grossIncome: this.round(bucket.grossIncome),
        totalExpenses: this.round(bucket.totalExpenses),
        loanCost: this.round(bucket.loanCost),
        netIncome: this.round(netIncome),
        plannedIncome: this.round(bucket.plannedIncome),
        plannedExpenses: this.round(bucket.plannedExpenses),
        plannedNetIncome: this.round(plannedNetIncome),
        expensesByCurrency: Object.fromEntries(
          Object.entries(bucket.expensesByCurrency).map(([k, v]) => [
            k,
            this.round(v),
          ]),
        ) as Record<string, number>,
      };
    });

    const totals = {
      grossIncome: this.round(months.reduce((s, m) => s + m.grossIncome, 0)),
      totalExpenses: this.round(
        months.reduce((s, m) => s + m.totalExpenses, 0),
      ),
      loanCost: this.round(months.reduce((s, m) => s + m.loanCost, 0)),
      netIncome: this.round(months.reduce((s, m) => s + m.netIncome, 0)),
      plannedIncome: this.round(
        months.reduce((s, m) => s + m.plannedIncome, 0),
      ),
      plannedExpenses: this.round(
        months.reduce((s, m) => s + m.plannedExpenses, 0),
      ),
      plannedNetIncome: this.round(
        months.reduce((s, m) => s + m.plannedNetIncome, 0),
      ),
    };

    // ── Balance-based cumulative savings (≈ net worth) ─────────
    // Compute actual account balances at each month-end from starting
    // balances + all transaction flows (in original currencies), then
    // subtract outstanding loan liability. This gives exact net worth
    // without any FX formula error.
    const { startingNetWorth, monthlyNetWorth } =
      await this.computeBalanceBasedSavings(userId, year, displayCurrency);

    const startingBalance = startingNetWorth;
    const cumulativeSavings = monthlyNetWorth;

    // Planned cumulative savings: starting balance + running planned net income
    const plannedCumulativeSavings: number[] = [];
    let plannedRunning = startingBalance;
    for (const m of months) {
      plannedRunning += m.plannedNetIncome;
      plannedCumulativeSavings.push(this.round(plannedRunning));
    }

    return {
      year,
      currency: displayCurrency,
      months,
      totals,
      startingBalance,
      cumulativeSavings,
      plannedCumulativeSavings,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Monthly Report (rich detail)
  // ────────────────────────────────────────────────────────────────

  async getMonthlyReport(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ): Promise<MonthlyReportResponse> {
    const { startDate, endDate } = this.getMonthRange(month, year);

    const transactions = await this.em.find(
      Transaction,
      {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
      },
      { populate: ['category', 'incomeSource', 'exchangeRate'] },
    );

    // Summary aggregation
    let grossIncome = 0;
    let totalExpenses = 0;
    let loanCost = 0;
    let fxCost = 0;

    // Expenses grouped by original currency
    const expenseCurrencyMap = new Map<
      string,
      { original: number; converted: number }
    >();

    // Income by source (income source name or category or 'Uncategorized')
    const incomeSourceMap = new Map<
      string,
      {
        converted: number;
        originalAmount: number;
        originalCurrency: string;
      }
    >();

    // Top categories for expenses
    const categoryTotals = new Map<string, { name: string; amount: number }>();

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const convertedAmount = await this.convertTx(
        rawAmount,
        transaction.currency,
        displayCurrency,
        transaction.date,
        transaction.exchangeRate,
      );

      if (REAL_INCOME_TYPES.includes(type)) {
        grossIncome += convertedAmount;

        // Track income by source (prefer linked IncomeSource, fall back to category)
        const sourceName =
          transaction.incomeSource?.name ??
          transaction.category?.name ??
          'Uncategorized';
        const existing = incomeSourceMap.get(sourceName);
        if (existing) {
          existing.converted += convertedAmount;
          existing.originalAmount += rawAmount;
        } else {
          incomeSourceMap.set(sourceName, {
            converted: convertedAmount,
            originalAmount: rawAmount,
            originalCurrency: transaction.currency,
          });
        }
      }

      if (REAL_EXPENSE_TYPES.includes(type)) {
        totalExpenses += convertedAmount;

        // Track expenses by currency
        const cur = transaction.currency;
        const entry = expenseCurrencyMap.get(cur) || {
          original: 0,
          converted: 0,
        };
        entry.original += rawAmount;
        entry.converted += convertedAmount;
        expenseCurrencyMap.set(cur, entry);

        // Track categories
        if (transaction.category) {
          const categoryId = transaction.category.id;
          const cat = categoryTotals.get(categoryId) || {
            name: transaction.category.name,
            amount: 0,
          };
          cat.amount += convertedAmount;
          categoryTotals.set(categoryId, cat);
        }
      }

      if (LOAN_COST_TYPES.includes(type)) {
        loanCost += convertedAmount;
      }

      if (type === TransactionType.FX_CONVERSION) {
        const direction = (transaction.metadata as Record<string, unknown>)?.direction;
        if (direction === 'inflow') {
          fxCost += convertedAmount;
        } else {
          fxCost -= convertedAmount;
        }
      }
    }

    const netIncome = grossIncome - totalExpenses - loanCost + fxCost;

    // Calculate previous months' savings using balance-based net worth
    const previousSavings = await this.getNetWorthAtDate(
      userId,
      new Date(year, month - 1, 1), // first day of this month
      displayCurrency,
    );
    const currentSavings = await this.getNetWorthAtDate(
      userId,
      new Date(year, month, 1), // first day of next month
      displayCurrency,
    );

    // Subscriptions total
    const subscriptions = await this.subscriptionService.findAll(userId);
    const activeSubscriptions = subscriptions.filter((s) => s.isActive);
    let subscriptionTotal = 0;
    for (const sub of activeSubscriptions) {
      subscriptionTotal += await this.convert(
        parseFloat(sub.amount),
        sub.currency,
        displayCurrency,
        new Date(year, month - 1, 15), // mid-month for rate
      );
    }

    // Loan summary
    const loans = await this.loanService.findAll(userId);
    let loanTotalRemaining = 0;
    let loanMonthlyPayment = 0;
    for (const loan of loans) {
      loanTotalRemaining += await this.convert(
        parseFloat(loan.amountLeft),
        loan.currency,
        displayCurrency,
        new Date(year, month - 1, 15),
      );
      loanMonthlyPayment += await this.convert(
        parseFloat(loan.monthlyPayment),
        loan.currency,
        displayCurrency,
        new Date(year, month - 1, 15),
      );
    }

    // Planned vs actual income comparison
    const comparison = await this.plannedIncomeService.getComparison(
      userId,
      month,
      year,
      displayCurrency,
    );

    // Build response
    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const expensesByCurrency = Array.from(expenseCurrencyMap.entries())
      .map(([currency, data]) => ({
        currency,
        originalAmount: this.round(data.original),
        convertedAmount: this.round(data.converted),
      }))
      .sort((a, b) => b.convertedAmount - a.convertedAmount);

    const incomeBySource = Array.from(incomeSourceMap.entries())
      .map(([source, data]) => ({
        source,
        amount: this.round(data.converted),
        originalAmount: this.round(data.originalAmount),
        originalCurrency: data.originalCurrency,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      month,
      year,
      currency: displayCurrency,
      summary: {
        grossIncome: this.round(grossIncome),
        totalExpenses: this.round(totalExpenses),
        loanCost: this.round(loanCost),
        netIncome: this.round(netIncome),
        transactionCount: transactions.length,
      },
      savings: {
        previous: this.round(previousSavings),
        leftover: this.round(currentSavings - previousSavings),
        total: this.round(currentSavings),
      },
      expensesByCurrency,
      incomeBySource,
      topCategories: topCategories.map((c) => ({
        name: c.name,
        amount: this.round(c.amount),
      })),
      subscriptionTotal: this.round(subscriptionTotal),
      loanSummary: {
        totalRemaining: this.round(loanTotalRemaining),
        monthlyPayment: this.round(loanMonthlyPayment),
      },
      plannedIncome: comparison.items.length > 0 ? comparison.items : undefined,
      depositBalance: this.round(
        await this.computeDepositBalance(userId, displayCurrency, new Date(year, month - 1, 15)),
      ),
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────────
  // Balance-based net worth computation
  // ────────────────────────────────────────────────────────────────

  /**
   * Compute net worth at each month-end of the given year from actual
   * account balances. This is exact: starting_balance + all_flows (in
   * original currencies) gives the true account balance. Only the final
   * month-end totals are converted to the display currency.
   */
  private async computeBalanceBasedSavings(
    userId: string,
    year: number,
    displayCurrency: string,
  ): Promise<{ startingNetWorth: number; monthlyNetWorth: number[] }> {
    // 1. Starting balances per currency (from earliest imports)
    const startingBalances = await this.getStartingBalancesPerCurrency(userId);

    // 2. Load ALL transactions ordered by date
    const transactions = await this.em.find(
      Transaction,
      { user: userId },
      { orderBy: { date: 'ASC' } },
    );

    // 3. Running per-currency balances and loan liability
    const balances: Record<string, number> = { ...startingBalances };
    const loans: Record<string, number> = {};

    const yearStart = new Date(year, 0, 1);

    // Process pre-year transactions
    let txIdx = 0;
    while (txIdx < transactions.length) {
      const tx = transactions[txIdx]!;
      const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
      if (txDate >= yearStart) break;
      this.applyTxToBalances(tx, balances, loans);
      txIdx++;
    }

    // Starting net worth (end of previous year)
    const startingNetWorth = await this.balancesToNetWorth(
      balances, loans, yearStart, displayCurrency,
    );

    // 4. Process each month, snapshot at month-end
    const monthlyNetWorth: number[] = [];
    for (let month = 0; month < 12; month++) {
      const nextMonthStart = new Date(year, month + 1, 1);
      const monthEnd = new Date(year, month + 1, 0); // last day

      while (txIdx < transactions.length) {
        const tx = transactions[txIdx]!;
        const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
        if (txDate >= nextMonthStart) break;
        this.applyTxToBalances(tx, balances, loans);
        txIdx++;
      }

      monthlyNetWorth.push(
        await this.balancesToNetWorth(balances, loans, monthEnd, displayCurrency),
      );
    }

    return { startingNetWorth: this.round(startingNetWorth), monthlyNetWorth };
  }

  /**
   * Compute net worth at a specific date (balance-based).
   * Used by the monthly report for previous/current savings.
   */
  private async getNetWorthAtDate(
    userId: string,
    beforeDate: Date,
    displayCurrency: string,
  ): Promise<number> {
    const startingBalances = await this.getStartingBalancesPerCurrency(userId);
    const transactions = await this.em.find(
      Transaction,
      { user: userId, date: { $lt: beforeDate } },
      { orderBy: { date: 'ASC' } },
    );

    const balances: Record<string, number> = { ...startingBalances };
    const loans: Record<string, number> = {};

    for (const tx of transactions) {
      this.applyTxToBalances(tx, balances, loans);
    }

    return this.balancesToNetWorth(balances, loans, beforeDate, displayCurrency);
  }

  /**
   * Get sum of starting balances per currency from earliest imports.
   */
  private async getStartingBalancesPerCurrency(
    userId: string,
  ): Promise<Record<string, number>> {
    const imports = await this.em.find(
      BankImport,
      { bankAccount: { user: userId } },
      { orderBy: { periodFrom: 'ASC' }, populate: ['bankAccount'] },
    );

    const seen = new Set<string>();
    const balances: Record<string, number> = {};

    for (const imp of imports) {
      const accountId =
        typeof imp.bankAccount === 'object'
          ? (imp.bankAccount as any).id
          : imp.bankAccount;
      if (seen.has(accountId)) continue;
      seen.add(accountId);

      const sb = (imp.startingBalance || {}) as Record<string, number>;
      for (const [cur, amount] of Object.entries(sb)) {
        if (!amount) continue;
        balances[cur] = (balances[cur] || 0) + amount;
      }
    }

    return balances;
  }

  /** Apply a transaction to running per-currency balances and loan tracking */
  private applyTxToBalances(
    tx: Transaction,
    balances: Record<string, number>,
    loans: Record<string, number>,
  ): void {
    const amount = parseFloat(tx.amount);
    const cur = tx.currency;
    const direction = (tx.metadata as Record<string, unknown>)?.direction;

    if (!balances[cur]) balances[cur] = 0;
    if (!loans[cur]) loans[cur] = 0;

    if (direction === 'inflow') {
      balances[cur]! += amount;
    } else {
      balances[cur]! -= amount;
    }

    // Track loan liability separately (disbursement = new debt, repayment = paid off)
    if (tx.type === TransactionType.LOAN_DISBURSEMENT) {
      loans[cur]! += amount;
    } else if (tx.type === TransactionType.LOAN_REPAYMENT) {
      loans[cur]! -= amount;
    }
  }

  /** Convert per-currency balances minus loans to a single display currency amount */
  private async balancesToNetWorth(
    balances: Record<string, number>,
    loans: Record<string, number>,
    date: Date,
    displayCurrency: string,
  ): Promise<number> {
    let netWorth = 0;
    for (const [cur, balance] of Object.entries(balances)) {
      const loan = loans[cur] || 0;
      const net = balance - loan;
      if (Math.abs(net) < 0.005) continue;
      netWorth += await this.convert(net, cur, displayCurrency, date);
    }
    return this.round(netWorth);
  }

  // ────────────────────────────────────────────────────────────────

  /**
   * Sum of starting balances from the earliest bank_import per bank account,
   * converted to the display currency. This represents wealth that existed
   * before any imported transactions.
   */
  private async getAccountBaseline(
    userId: string,
    displayCurrency: string,
  ): Promise<number> {
    // Get all bank imports, grouped by bank account, earliest first
    const imports = await this.em.find(
      BankImport,
      { bankAccount: { user: userId } },
      { orderBy: { periodFrom: 'ASC' }, populate: ['bankAccount'] },
    );

    // Keep only the earliest import per bank account
    const seen = new Set<string>();
    const earliest: BankImport[] = [];
    for (const imp of imports) {
      const accountId =
        typeof imp.bankAccount === 'object'
          ? (imp.bankAccount as any).id
          : imp.bankAccount;
      if (!seen.has(accountId)) {
        seen.add(accountId);
        earliest.push(imp);
      }
    }

    // Sum starting balances across all accounts, converting each currency
    let total = 0;
    for (const imp of earliest) {
      const balances = imp.startingBalance || {};
      for (const [cur, amount] of Object.entries(balances)) {
        if (amount === 0) continue;
        const converted = await this.convert(
          amount,
          cur,
          displayCurrency,
          imp.periodFrom,
        );
        total += converted;
      }
    }

    return total;
  }

  /**
   * Net income (income - expenses - loan cost) from all transactions
   * strictly before the given date, across all years.
   */
  private async getNetIncomeBefore(
    userId: string,
    beforeDate: Date,
    displayCurrency: string,
  ): Promise<number> {
    const transactions = await this.em.find(
      Transaction,
      { user: userId, date: { $lt: beforeDate } },
      { populate: ['exchangeRate'] },
    );

    let income = 0;
    let expenses = 0;
    let loanCostTotal = 0;
    let fxCost = 0;

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const convertedAmount = await this.convertTx(
        rawAmount,
        transaction.currency,
        displayCurrency,
        transaction.date,
        transaction.exchangeRate,
      );

      if (REAL_INCOME_TYPES.includes(type)) income += convertedAmount;
      if (REAL_EXPENSE_TYPES.includes(type)) expenses += convertedAmount;
      if (LOAN_COST_TYPES.includes(type)) loanCostTotal += convertedAmount;

      if (type === TransactionType.FX_CONVERSION) {
        const direction = (transaction.metadata as Record<string, unknown>)?.direction;
        if (direction === 'inflow') {
          fxCost += convertedAmount;
        } else {
          fxCost -= convertedAmount;
        }
      }
    }

    return income - expenses - loanCostTotal + fxCost;
  }

  /**
   * All-time previous savings: account baseline + net income from all
   * transactions before the start of the given month/year.
   */
  private async calculatePreviousSavings(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ): Promise<number> {
    const beforeDate = new Date(year, month - 1, 1); // first day of this month
    const accountBaseline = await this.getAccountBaseline(
      userId,
      displayCurrency,
    );
    const priorNetIncome = await this.getNetIncomeBefore(
      userId,
      beforeDate,
      displayCurrency,
    );
    return accountBaseline + priorNetIncome;
  }


  // ────────────────────────────────────────────────────────────────
  // Balance Reconciliation
  // ────────────────────────────────────────────────────────────────

  async getBalanceReconciliation(userId: string) {
    // Get all bank imports with their bank accounts
    const imports = await this.em.find(
      BankImport,
      { bankAccount: { user: userId } },
      { orderBy: { periodFrom: 'ASC' }, populate: ['bankAccount'] },
    );

    // Group imports by bank account — keep earliest and latest per account
    const accountMap = new Map<
      string,
      {
        iban: string;
        accountOwner: string;
        accountType: string;
        earliest: BankImport;
        latest: BankImport;
      }
    >();

    for (const imp of imports) {
      const account = imp.bankAccount as any;
      const accountId = account?.id ?? imp.bankAccount;
      const existing = accountMap.get(accountId);
      if (!existing) {
        accountMap.set(accountId, {
          iban: account?.iban ?? '',
          accountOwner: account?.accountOwner ?? '',
          accountType: account?.accountType ?? '',
          earliest: imp,
          latest: imp,
        });
      } else {
        if (imp.periodFrom < existing.earliest.periodFrom) {
          existing.earliest = imp;
        }
        if (imp.periodTo > existing.latest.periodTo) {
          existing.latest = imp;
        }
      }
    }

    // For each account, calculate expected end balance from transactions
    const results = [];
    for (const [accountId, info] of accountMap) {
      const transactions = await this.em.find(Transaction, {
        user: userId,
        bankImport: { bankAccount: accountId },
      });

      // Sum inflows/outflows per currency in original currencies
      const flowByCurrency: Record<string, number> = {};
      for (const tx of transactions) {
        const cur = tx.currency;
        const rawAmount = parseFloat(tx.amount);
        const metadata = tx.metadata as any;
        const isInflow = metadata?.direction === 'inflow';
        const signed = isInflow ? rawAmount : -rawAmount;
        flowByCurrency[cur] = (flowByCurrency[cur] ?? 0) + signed;
      }

      // Calculate expected end balance per currency
      const startBalance = info.earliest.startingBalance || {};
      const statementEndBalance = info.latest.endBalance || {};
      const calculatedEndBalance: Record<string, number> = {};
      const differences: Record<string, number> = {};

      // Merge all currencies from start, end, and flows
      const allCurrencies = new Set([
        ...Object.keys(startBalance),
        ...Object.keys(statementEndBalance),
        ...Object.keys(flowByCurrency),
      ]);

      let isReconciled = true;
      for (const cur of allCurrencies) {
        const start = startBalance[cur] ?? 0;
        const flow = flowByCurrency[cur] ?? 0;
        const calculated = this.round(start + flow);
        const expected = statementEndBalance[cur] ?? 0;
        calculatedEndBalance[cur] = calculated;
        differences[cur] = this.round(expected - calculated);
        if (Math.abs(differences[cur]) > 0.01) {
          isReconciled = false;
        }
      }

      results.push({
        accountId,
        iban: info.iban,
        accountOwner: info.accountOwner,
        accountType: info.accountType,
        periodFrom: info.earliest.periodFrom,
        periodTo: info.latest.periodTo,
        statementStartBalance: startBalance,
        statementEndBalance,
        calculatedEndBalance,
        differences,
        transactionCount: transactions.length,
        isReconciled,
      });
    }

    return results;
  }

  // ────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────

  /**
   * Convert using the transaction's linked exchange rate when available.
   * This ensures we use the actual bank rate (from statement descriptions)
   * rather than the NBG API rate, eliminating FX spread discrepancies.
   *
   * Falls back to date-based lookup if no linked rate exists.
   */
  private async convertTx(
    amount: number,
    from: string,
    to: string,
    date: Date,
    linkedRate?: ExchangeRate | null,
  ): Promise<number> {
    if (from === to) return amount;

    try {
      // If we have a linked rate for the source currency, use it directly
      if (linkedRate && from !== Currency.GEL) {
        const fromRateToGel = parseFloat(linkedRate.rateToGel);

        if (to === Currency.GEL) {
          // Simple: amount * rateToGel
          return amount * fromRateToGel;
        }

        // Cross-currency: need the target currency's rate too
        const toRate = await this.exchangeRateService.getRate(to, date);
        return (amount * fromRateToGel) / toRate;
      }

      // GEL source or no linked rate: use date-based lookup
      return await this.exchangeRateService.convertAmount(amount, from, to, date);
    } catch {
      this.logger.warn(
        { from, to, date: date.toISOString() },
        'Exchange rate not found, returning unconverted amount',
      );
      return amount;
    }
  }

  /** Legacy convert method for non-transaction amounts (subscriptions, loans, etc.) */
  private async convert(
    amount: number,
    from: string,
    to: string,
    date: Date,
  ): Promise<number> {
    if (from === to) return amount;
    try {
      return await this.exchangeRateService.convertAmount(
        amount,
        from,
        to,
        date,
      );
    } catch {
      this.logger.warn(
        { from, to, date: date.toISOString() },
        'Exchange rate not found, returning unconverted amount',
      );
      return amount;
    }
  }

  private getMonthRange(month: number, year: number) {
    return {
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0),
    };
  }

  /**
   * Compute total deposit balance from DEPOSIT-type transactions via raw SQL
   * aggregate, then convert per-currency totals to the display currency.
   *
   * Only counts transactions from bank accounts with account_type = 'DEPOSIT'
   * to avoid double-counting (the same deposit event appears on checking and
   * savings accounts as outflow/transfer transactions).
   */
  private async computeDepositBalance(
    userId: string,
    displayCurrency: string,
    referenceDate: Date,
  ): Promise<number> {
    const rows: { total: string; currency: string }[] = await this.em.execute(
      `SELECT COALESCE(SUM(t.amount::numeric), 0) as total, t.currency
       FROM transaction t
       JOIN bank_import bi ON bi.id = t.bank_import_id
       JOIN bank_account ba ON ba.id = bi.bank_account_id
       WHERE t.user_id = ? AND t.type = 'DEPOSIT'
         AND ba.account_type = 'DEPOSIT'
       GROUP BY t.currency`,
      [userId],
    );

    let balance = 0;
    for (const row of rows) {
      const amount = parseFloat(row.total);
      if (amount === 0) continue;
      balance += await this.convert(amount, row.currency, displayCurrency, referenceDate);
    }
    return balance;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
