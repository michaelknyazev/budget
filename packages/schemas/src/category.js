"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCategorySchema = exports.CreateCategorySchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.CreateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).describe('Category name'),
    type: enums_1.CategoryTypeEnum.describe('Category type'),
    icon: zod_1.z
        .string()
        .max(50)
        .nullable()
        .optional()
        .describe('Blueprint icon name'),
    color: zod_1.z
        .string()
        .max(20)
        .nullable()
        .optional()
        .describe('Color for UI tags'),
    mccCodes: zod_1.z
        .array(zod_1.z.number().int().min(0).max(9999))
        .nullable()
        .optional()
        .describe('MCC codes for auto-categorization'),
});
exports.UpdateCategorySchema = exports.CreateCategorySchema.partial();
//# sourceMappingURL=category.js.map