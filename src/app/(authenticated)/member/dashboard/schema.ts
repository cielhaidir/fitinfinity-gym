import { z } from "zod";

export const getUpcomingClassesSchema = z.object({
  limit: z.number().optional().default(3), // Default show 3 classes
  memberId: z.string(), // For checking if member is registered
});

// New schema for active package
export const getActivePackageSchema = z.object({
  memberId: z.string(),
});

export type GetUpcomingClasses = z.infer<typeof getUpcomingClassesSchema>;
export type GetActivePackage = z.infer<typeof getActivePackageSchema>;
