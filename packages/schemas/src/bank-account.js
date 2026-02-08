"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBankAccountSchema = exports.CreateBankAccountSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateBankAccountSchema = zod_1.z.object({
    iban: zod_1.z.string().min(15).max(34).describe('IBAN'),
    bankName: zod_1.z.string().min(1).max(200).describe('Bank name'),
    bankCode: zod_1.z
        .string()
        .max(20)
        .nullable()
        .optional()
        .describe('SWIFT/BIC code'),
    accountOwner: zod_1.z.string().min(1).max(200).describe('Account owner name'),
    accountType: enums_1.AccountTypeEnum.describe('Account type'),
    interestRate: zod_1.z
        .number()
        .min(0)
        .max(100)
        .nullable()
        .optional()
        .describe('Annual interest rate (for DEPOSIT)'),
    effectiveRate: zod_1.z
        .number()
        .min(0)
        .max(100)
        .nullable()
        .optional()
        .describe('Effective annual rate (for DEPOSIT)'),
});
exports.UpdateBankAccountSchema = exports.CreateBankAccountSchema.partial();
//# sourceMappingURL=bank-account.js.map