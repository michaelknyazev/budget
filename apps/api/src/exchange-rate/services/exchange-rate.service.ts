import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ExchangeRate } from '../entities/exchange-rate.entity';
import {
  ExchangeRateInput,
  Currency,
  ExchangeRateSource,
} from '@budget/schemas';

interface NbgCurrencyResponse {
  code: string;
  quantity: number;
  rateFormated: string;
  diffFormated: string;
  rate: number;
  name: string;
  diff: number;
  date: string;
  validFromDate: string;
}

interface NbgApiResponse {
  date: string;
  currencies: NbgCurrencyResponse[];
}

const NBG_URL =
  'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/';
const TRACKED_CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB'];

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit() {
    // Fetch today's rates on startup (use forked EM since we're outside request context)
    const forkedEm = this.em.fork();
    try {
      await this.fetchRatesFromNBG(forkedEm, new Date());
      this.logger.log('Fetched today exchange rates from NBG on startup');
    } catch (error) {
      this.logger.warn(
        { err: error },
        'Failed to fetch exchange rates from NBG on startup',
      );
    }
  }

  async findAll(): Promise<ExchangeRate[]> {
    return this.em.find(ExchangeRate, {}, { orderBy: { date: 'DESC' } });
  }

  async findById(id: string): Promise<ExchangeRate> {
    const rate = await this.em.findOne(ExchangeRate, { id });
    if (!rate) {
      throw new NotFoundException({
        message: 'Exchange rate not found',
        id,
      });
    }
    return rate;
  }

  async findByCurrencyAndDate(
    currency: string,
    date: Date,
  ): Promise<ExchangeRate | null> {
    return this.em.findOne(ExchangeRate, {
      currency: currency as Currency,
      date,
    });
  }

  /**
   * Fetch exchange rates from NBG API for a specific date.
   * GEL is the pivot currency (rate = 1.0).
   * Uses the request-scoped EntityManager by default.
   */
  async fetchFromNBG(date: Date): Promise<ExchangeRate[]> {
    return this.fetchRatesFromNBG(this.em, date);
  }

  /**
   * Internal: fetch and persist exchange rates using the given EntityManager.
   * Accepts an explicit EM so callers outside request context can pass a forked EM.
   */
  private async fetchRatesFromNBG(
    em: EntityManager,
    date: Date,
  ): Promise<ExchangeRate[]> {
    const dateStr = date.toISOString().split('T')[0]!;
    const url = `${NBG_URL}?date=${dateStr}`;

    this.logger.log({ url, date: dateStr }, 'Fetching rates from NBG');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NBG API returned ${response.status}`);
    }

    const json = (await response.json()) as NbgApiResponse[];
    const currencies = json[0]?.currencies || [];

    const savedRates: ExchangeRate[] = [];

    for (const cur of currencies) {
      if (!TRACKED_CURRENCIES.includes(cur.code)) continue;

      const existing = await em.findOne(ExchangeRate, {
        currency: cur.code as Currency,
        date,
      });

      if (existing) {
        savedRates.push(existing);
        continue;
      }

      // rateToGel = rate / quantity (e.g., for RUB: quantity=100, rate=3.xx → rateToGel = 0.03xx per 1 RUB)
      const rateToGel = cur.rate / cur.quantity;

      const rate = em.create(ExchangeRate, {
        currency: cur.code as Currency,
        rateToGel: rateToGel.toString(),
        quantity: cur.quantity,
        rawRate: cur.rate.toString(),
        date,
        source: ExchangeRateSource.NBG_API as ExchangeRateSource,
      });

      em.persist(rate);
      savedRates.push(rate);
    }

    await em.flush();
    this.logger.log(
      { count: savedRates.length, date: dateStr },
      'NBG rates saved',
    );
    return savedRates;
  }

  /**
   * Get the exchange rate for a currency on a date.
   * Auto-fetches from NBG if not found locally.
   * GEL always returns rate 1.0.
   */
  async getRate(currency: string, date: Date): Promise<number> {
    if (currency === Currency.GEL) return 1.0;

    const existing = await this.findByCurrencyAndDate(currency, date);
    if (existing) return parseFloat(existing.rateToGel);

    // Try to fetch from NBG
    await this.fetchFromNBG(date);

    const fetched = await this.findByCurrencyAndDate(currency, date);
    if (fetched) return parseFloat(fetched.rateToGel);

    throw new NotFoundException(
      `No exchange rate found for ${currency} on ${date.toISOString().split('T')[0]}`,
    );
  }

  /**
   * Convert an amount from one currency to another via GEL pivot.
   * USD→EUR = (USD/GEL) / (EUR/GEL)
   */
  async convertAmount(
    amount: number,
    from: string,
    to: string,
    date: Date,
  ): Promise<number> {
    if (from === to) return amount;

    const fromRate = await this.getRate(from, date);
    const toRate = await this.getRate(to, date);

    // amount in GEL = amount * fromRate
    // amount in target = (amount * fromRate) / toRate
    return (amount * fromRate) / toRate;
  }

  /**
   * Ensure exchange rates exist for all given (currency, date) pairs.
   * - Deduplicates pairs
   * - Batch-queries DB for existing rates
   * - Fetches missing dates from NBG API (one call per unique date)
   * - Creates GEL records with rateToGel=1.0
   * - Returns a Map keyed by "CURRENCY|YYYY-MM-DD" → ExchangeRate
   */
  async ensureRatesForDates(
    pairs: Array<{ currency: Currency; date: Date }>,
  ): Promise<Map<string, ExchangeRate>> {
    const result = new Map<string, ExchangeRate>();

    // Deduplicate pairs
    const uniqueKeys = new Set<string>();
    const deduped: Array<{ currency: Currency; dateStr: string; date: Date }> = [];

    for (const { currency, date } of pairs) {
      const dateStr = date.toISOString().split('T')[0]!;
      const key = `${currency}|${dateStr}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        deduped.push({ currency, dateStr, date });
      }
    }

    if (deduped.length === 0) return result;

    // Batch query: find all existing rates for the needed (currency, date) pairs
    const orConditions = deduped.map((p) => ({
      currency: p.currency,
      date: p.date,
    }));
    const existingRates = await this.em.find(ExchangeRate, {
      $or: orConditions,
    });

    // Index existing rates
    const existingMap = new Map<string, ExchangeRate>();
    for (const rate of existingRates) {
      const d = rate.date instanceof Date
        ? rate.date.toISOString().split('T')[0]!
        : String(rate.date);
      existingMap.set(`${rate.currency}|${d}`, rate);
    }

    // Separate found vs missing
    const missingDates = new Set<string>();
    const missingGelDates: Array<{ dateStr: string; date: Date }> = [];

    for (const p of deduped) {
      const key = `${p.currency}|${p.dateStr}`;
      const existing = existingMap.get(key);
      if (existing) {
        result.set(key, existing);
      } else if (p.currency === Currency.GEL) {
        // GEL needs a synthetic record, not an NBG fetch
        missingGelDates.push({ dateStr: p.dateStr, date: p.date });
      } else {
        // Need to fetch from NBG for this date
        missingDates.add(p.dateStr);
      }
    }

    // Fetch missing dates from NBG (one API call per unique date)
    for (const dateStr of missingDates) {
      const date = new Date(dateStr + 'T00:00:00.000Z');
      try {
        const fetched = await this.fetchFromNBG(date);
        for (const rate of fetched) {
          const d = rate.date instanceof Date
            ? rate.date.toISOString().split('T')[0]!
            : String(rate.date);
          const key = `${rate.currency}|${d}`;
          if (!result.has(key)) {
            result.set(key, rate);
          }
        }
      } catch (error) {
        this.logger.warn(
          { err: error, date: dateStr },
          'Failed to fetch exchange rates from NBG for date',
        );
      }
    }

    // Create GEL records (rateToGel = 1.0) for missing GEL dates
    for (const { dateStr, date } of missingGelDates) {
      const gelRate = this.em.create(ExchangeRate, {
        currency: Currency.GEL,
        rateToGel: '1.000000',
        quantity: 1,
        rawRate: '1.000000',
        date,
        source: ExchangeRateSource.MANUAL as ExchangeRateSource,
      });
      this.em.persist(gelRate);
      result.set(`${Currency.GEL}|${dateStr}`, gelRate);
    }

    if (missingGelDates.length > 0) {
      await this.em.flush();
    }

    // Fill result for any remaining deduped pairs that were fetched via NBG
    // (fetchFromNBG fetches all tracked currencies for a date, so some may now be in the map)
    for (const p of deduped) {
      const key = `${p.currency}|${p.dateStr}`;
      if (!result.has(key)) {
        // Try DB one more time (fetchFromNBG may have stored it)
        const rate = await this.findByCurrencyAndDate(p.currency, p.date);
        if (rate) {
          result.set(key, rate);
        }
      }
    }

    this.logger.log(
      { totalPairs: deduped.length, resolved: result.size },
      'Exchange rates ensured for import',
    );

    return result;
  }

  /**
   * Returns the latest exchange rate for each tracked currency.
   * Useful for frontend display-currency conversion.
   */
  async findLatestRates(): Promise<Record<string, number>> {
    const rates: Record<string, number> = { GEL: 1 };

    for (const code of TRACKED_CURRENCIES) {
      const latest = await this.em.findOne(
        ExchangeRate,
        { currency: code as Currency },
        { orderBy: { date: 'DESC' } },
      );
      if (latest) {
        rates[code] = parseFloat(latest.rateToGel);
      }
    }

    return rates;
  }

  async create(data: ExchangeRateInput): Promise<ExchangeRate> {
    const rate = this.em.create(ExchangeRate, {
      ...data,
      currency: data.currency as Currency,
      source: data.source as ExchangeRateSource,
      rateToGel: data.rateToGel.toString(),
      rawRate: data.rawRate.toString(),
      date: new Date(data.date),
    });

    this.em.persist(rate);
    await this.em.flush();
    this.logger.log(
      { rateId: rate.id, currency: data.currency, date: data.date },
      'Exchange rate created',
    );

    return rate;
  }

  async update(
    id: string,
    data: Partial<ExchangeRateInput>,
  ): Promise<ExchangeRate> {
    const rate = await this.findById(id);

    const updateData: Partial<ExchangeRate> = {};
    if (data.currency !== undefined)
      updateData.currency = data.currency as Currency;
    if (data.rateToGel !== undefined)
      updateData.rateToGel = data.rateToGel.toString();
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.rawRate !== undefined) updateData.rawRate = data.rawRate.toString();
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.source !== undefined)
      updateData.source = data.source as ExchangeRateSource;

    this.em.assign(rate, updateData);
    await this.em.flush();
    this.logger.log({ rateId: id }, 'Exchange rate updated');

    return rate;
  }

  async delete(id: string): Promise<void> {
    const rate = await this.findById(id);
    await this.em.removeAndFlush(rate);
    this.logger.log({ rateId: id }, 'Exchange rate deleted');
  }
}
