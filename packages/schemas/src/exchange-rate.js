"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryExchangeRateSchema = exports.ExchangeRateSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.ExchangeRateSchema = zod_1.z.object({
    currency: enums_1.CurrencyEnum.describe('Currency code'),
    rateToGel: zod_1.z
        .number()
        .positive()
        .describe('GEL per 1 unit of currency'),
    quantity: zod_1.z
        .number()
        .int()
        .positive()
        .describe('NBG quantity (1 for USD, 100 for RUB)'),
    rawRate: zod_1.z.number().positive().describe('Raw NBG rate'),
    date: zod_1.z.string().date().describe('Rate date'),
    source: enums_1.ExchangeRateSourceEnum.describe('Rate source'),
});
exports.QueryExchangeRateSchema = zod_1.z.object({
    currency: enums_1.CurrencyEnum.describe('Currency code'),
    date: zod_1.z.string().date().describe('Rate date'),
});
//# sourceMappingURL=exchange-rate.js.map