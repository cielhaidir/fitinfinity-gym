import { z } from "zod";

export const chartAccountSchema = z.object({
  id: z.number().optional(),
  reff: z.string().min(1, "Reference is required"),
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Account type is required"),
  flow: z.enum(["income", "outcome", "both"], {
    required_error: "Flow type is required",
  }),
});

export const createChartAccountSchema = chartAccountSchema.omit({ id: true });

export const updateChartAccountSchema = chartAccountSchema;

export type ChartAccount = z.infer<typeof chartAccountSchema>;
export type CreateChartAccount = z.infer<typeof createChartAccountSchema>;
export type UpdateChartAccount = z.infer<typeof updateChartAccountSchema>;
