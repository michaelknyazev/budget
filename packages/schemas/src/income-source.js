"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateIncomeSourceSchema = exports.CreateIncomeSourceSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateIncomeSourceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).describe('Income source name'),
    currency: enums_1.CurrencyEnum,
    defaultAmount: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01)
        .nullable()
        .optional()
        .describe('Expected monthly amount'),
    isActive: zod_1.z.boolean().default(true),
});
exports.UpdateIncomeSourceSchema = exports.CreateIncomeSourceSchema.partial();
//# sourceMappingURL=income-source.js.map