"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBudgetTargetSchema = exports.UpdateBudgetTargetSchema = exports.CreateBudgetTargetSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateBudgetTargetSchema = zod_1.z.object({
    categoryId: zod_1.z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Category (null = total target)'),
    month: zod_1.z.number().int().min(1).max(12).describe('Target month'),
    year: zod_1.z.number().int().min(2020).max(2100).describe('Target year'),
    targetAmount: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01)
        .describe('Planned amount'),
    currency: enums_1.CurrencyEnum.describe('Target currency'),
    type: zod_1.z
        .enum(['EXPENSE', 'INCOME'])
        .describe('Spending limit or income goal'),
});
exports.UpdateBudgetTargetSchema = exports.CreateBudgetTargetSchema.partial();
exports.QueryBudgetTargetSchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
});
//# sourceMappingURL=budget-target.js.map