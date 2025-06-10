import { z } from "zod";

export const attendanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employee: z.object({
    id: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    }),
  }),
  checkIn: z.date(),
  checkOut: z.date().nullable(),
  date: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Attendance = z.infer<typeof attendanceSchema>;
