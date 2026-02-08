"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionResponseSchema = exports.QueryTransactionsSchema = exports.UpdateTransactionSchema = exports.CreateTransactionSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateTransactionSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Title is required')
        .max(500)
        .describe('Transaction title or merchant name'),
    amount: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01)
        .describe('Amount (always positive)'),
    currency: enums_1.CurrencyEnum.describe('Transaction currency'),
    type: enums_1.TransactionTypeEnum.describe('Transaction type'),
    categoryId: zod_1.z.string().uuid().nullable().optional().describe('Category ID'),
    date: zod_1.z.string().date().describe('Transaction date (YYYY-MM-DD)'),
    merchantName: zod_1.z
        .string()
        .max(200)
        .nullable()
        .optional()
        .describe('Merchant name'),
    merchantLocation: zod_1.z
        .string()
        .max(500)
        .nullable()
        .optional()
        .describe('Merchant location'),
    mccCode: zod_1.z
        .number()
        .int()
        .min(0)
        .max(9999)
        .nullable()
        .optional()
        .describe('Merchant Category Code'),
});
exports.UpdateTransactionSchema = exports.CreateTransactionSchema.partial();
exports.QueryTransactionsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    month: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe('Filter by month'),
    year: zod_1.z.coerce
        .number()
        .int()
        .min(2020)
        .max(2100)
        .optional()
        .describe('Filter by year'),
    currency: enums_1.CurrencyEnum.optional().describe('Filter by currency'),
    type: enums_1.TransactionTypeEnum.optional().describe('Filter by transaction type'),
    categoryId: zod_1.z.string().uuid().optional().describe('Filter by category'),
    merchantName: zod_1.z.string().optional().describe('Search by merchant name'),
    mccCode: zod_1.z.coerce
        .number()
        .int()
        .optional()
        .describe('Filter by MCC code'),
});
exports.TransactionResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().describe('Transaction ID'),
    title: zod_1.z.string().describe('Transaction title'),
    amount: zod_1.z.number().describe('Amount (always positive)'),
    currency: enums_1.CurrencyEnum,
    type: enums_1.TransactionTypeEnum,
    date: zod_1.z.string().date(),
    postingDate: zod_1.z.string().date().nullable(),
    merchantName: zod_1.z.string().nullable(),
    merchantLocation: zod_1.z.string().nullable(),
    mccCode: zod_1.z.number().int().nullable(),
    cardLastFour: zod_1.z.string().nullable(),
    rawDetails: zod_1.z.string().nullable(),
    metadata: zod_1.z.record(zod_1.z.unknown()).nullable(),
    categoryId: zod_1.z.string().uuid().nullable(),
    bankImportId: zod_1.z.string().uuid().nullable(),
    importHash: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=transaction.js.map