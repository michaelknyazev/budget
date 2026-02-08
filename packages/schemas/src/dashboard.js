"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryMonthlySummarySchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.QueryMonthlySummarySchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    currency: enums_1.CurrencyEnum.default('USD').describe('Display currency'),
});
//# sourceMappingURL=dashboard.js.map