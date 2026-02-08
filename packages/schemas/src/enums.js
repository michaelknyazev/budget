"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINANCING_NOISE_TYPES = exports.LOAN_COST_TYPES = exports.REAL_EXPENSE_TYPES = exports.REAL_INCOME_TYPES = exports.ExchangeRateSourceEnum = exports.AccountTypeEnum = exports.CategoryTypeEnum = exports.TransactionTypeEnum = exports.CurrencyEnum = exports.ExchangeRateSource = exports.AccountType = exports.CategoryType = exports.TransactionType = exports.Currency = void 0;
const zod_1 = require("zod");
var Currency;
(function (Currency) {
    Currency["USD"] = "USD";
    Currency["GEL"] = "GEL";
    Currency["RUB"] = "RUB";
    Currency["EUR"] = "EUR";
    Currency["GBP"] = "GBP";
})(Currency || (exports.Currency = Currency = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["EXPENSE"] = "EXPENSE";
    TransactionType["INCOME"] = "INCOME";
    TransactionType["TRANSFER"] = "TRANSFER";
    TransactionType["LOAN_DISBURSEMENT"] = "LOAN_DISBURSEMENT";
    TransactionType["LOAN_REPAYMENT"] = "LOAN_REPAYMENT";
    TransactionType["LOAN_INTEREST"] = "LOAN_INTEREST";
    TransactionType["FX_CONVERSION"] = "FX_CONVERSION";
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["FEE"] = "FEE";
    TransactionType["ATM_WITHDRAWAL"] = "ATM_WITHDRAWAL";
    TransactionType["INTEREST_INCOME"] = "INTEREST_INCOME";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var CategoryType;
(function (CategoryType) {
    CategoryType["EXPENSE"] = "EXPENSE";
    CategoryType["INCOME"] = "INCOME";
    CategoryType["ANY"] = "ANY";
})(CategoryType || (exports.CategoryType = CategoryType = {}));
var AccountType;
(function (AccountType) {
    AccountType["CHECKING"] = "CHECKING";
    AccountType["DEPOSIT"] = "DEPOSIT";
    AccountType["SAVINGS"] = "SAVINGS";
})(AccountType || (exports.AccountType = AccountType = {}));
var ExchangeRateSource;
(function (ExchangeRateSource) {
    ExchangeRateSource["NBG_API"] = "NBG_API";
    ExchangeRateSource["MANUAL"] = "MANUAL";
    ExchangeRateSource["BANK_STATEMENT"] = "BANK_STATEMENT";
})(ExchangeRateSource || (exports.ExchangeRateSource = ExchangeRateSource = {}));
// Zod schemas for runtime validation
exports.CurrencyEnum = zod_1.z.enum(['USD', 'GEL', 'RUB', 'EUR', 'GBP']);
exports.TransactionTypeEnum = zod_1.z.enum([
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
exports.CategoryTypeEnum = zod_1.z.enum(['EXPENSE', 'INCOME', 'ANY']);
exports.AccountTypeEnum = zod_1.z.enum(['CHECKING', 'DEPOSIT', 'SAVINGS']);
exports.ExchangeRateSourceEnum = zod_1.z.enum([
    'NBG_API',
    'MANUAL',
    'BANK_STATEMENT',
]);
/** Financial reporting groups */
exports.REAL_INCOME_TYPES = [
    TransactionType.INCOME,
    TransactionType.INTEREST_INCOME,
];
exports.REAL_EXPENSE_TYPES = [
    TransactionType.EXPENSE,
    TransactionType.FEE,
    TransactionType.ATM_WITHDRAWAL,
];
exports.LOAN_COST_TYPES = [
    TransactionType.LOAN_INTEREST,
];
exports.FINANCING_NOISE_TYPES = [
    TransactionType.TRANSFER,
    TransactionType.LOAN_DISBURSEMENT,
    TransactionType.LOAN_REPAYMENT,
    TransactionType.FX_CONVERSION,
    TransactionType.DEPOSIT,
];
//# sourceMappingURL=enums.js.map