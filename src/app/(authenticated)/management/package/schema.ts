import { z } from "zod";

export const PackageTypeEnum = z.enum(["GYM_MEMBERSHIP", "PERSONAL_TRAINER", "GROUP_TRAINING"]);
export const GroupPriceTypeEnum = z.enum(["TOTAL", "PER_PERSON"]);

export const PackageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  point: z
    .number()
    .min(0, "Points must be greater than or equal to 0")
    .default(0),
  type: PackageTypeEnum,
  sessions: z.number().nullable(),
  day: z.number().min(0, "Days must be greater than or equal to 0").nullable(),
  isActive: z.boolean().default(true),
  // Group package fields
  maxUsers: z.number().min(1, "Max users must be at least 1").nullable(),
  isGroupPackage: z.boolean().default(false),
  groupPriceType: GroupPriceTypeEnum.nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Package = z.infer<typeof PackageSchema>;
export type PackageType = z.infer<typeof PackageTypeEnum>;
export type GroupPriceType = z.infer<typeof GroupPriceTypeEnum>;
