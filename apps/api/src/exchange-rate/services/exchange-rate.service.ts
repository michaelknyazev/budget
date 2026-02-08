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

const NBG_URL =
  'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/';
const TRACKED_CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB'];

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit() {
    // Fetch today's rates on startup
    try {
      await this.fetchFromNBG(new Date());
      this.logger.log('Fetched today exchange rates from NBG on startup');
    } catch (error) {
      this.logger.warn(
        { error },
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
   */
  async fetchFromNBG(date: Date): Promise<ExchangeRate[]> {
    const dateStr = date.toISOString().split('T')[0]!;
    const url = `${NBG_URL}?date=${dateStr}`;

    this.logger.log({ url, date: dateStr }, 'Fetching rates from NBG');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NBG API returned ${response.status}`);
    }

    const json = (await response.json()) as NbgCurrencyResponse[][];
    const currencies = json[0] || [];

    const savedRates: ExchangeRate[] = [];

    for (const cur of currencies) {
      if (!TRACKED_CURRENCIES.includes(cur.code)) continue;

      const existing = await this.em.findOne(ExchangeRate, {
        currency: cur.code as Currency,
        date,
      });

      if (existing) {
        savedRates.push(existing);
        continue;
      }

      // rateToGel = rate / quantity (e.g., for RUB: quantity=100, rate=3.xx → rateToGel = 0.03xx per 1 RUB)
      const rateToGel = cur.rate / cur.quantity;

      const rate = this.em.create(ExchangeRate, {
        currency: cur.code as Currency,
        rateToGel: rateToGel.toString(),
        quantity: cur.quantity,
        rawRate: cur.rate.toString(),
        date,
        source: ExchangeRateSource.NBG_API as ExchangeRateSource,
      });

      this.em.persist(rate);
      savedRates.push(rate);
    }

    await this.em.flush();
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
