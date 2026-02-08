"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSubscriptionSchema = exports.CreateSubscriptionSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateSubscriptionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).describe('Subscription name'),
    amount: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01)
        .describe('Monthly amount'),
    currency: enums_1.CurrencyEnum,
    dayOfMonth: zod_1.z.number().int().min(1).max(31).describe('Billing day'),
    owner: zod_1.z
        .string()
        .max(100)
        .nullable()
        .optional()
        .describe('Who owns this subscription'),
    categoryId: zod_1.z.string().uuid().nullable().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.UpdateSubscriptionSchema = exports.CreateSubscriptionSchema.partial();
//# sourceMappingURL=subscription.js.map