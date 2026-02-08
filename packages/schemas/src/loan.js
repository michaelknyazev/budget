"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLoanSchema = exports.CreateLoanSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateLoanSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).describe('Loan name'),
    amountLeft: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01)
        .describe('Remaining balance'),
    monthlyPayment: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01)
        .describe('Monthly payment'),
    currency: enums_1.CurrencyEnum,
    holder: zod_1.z.string().min(1).max(100).describe('Loan holder'),
    loanNumber: zod_1.z
        .string()
        .max(50)
        .nullable()
        .optional()
        .describe('Bank loan reference number'),
});
exports.UpdateLoanSchema = exports.CreateLoanSchema.partial();
//# sourceMappingURL=loan.js.map