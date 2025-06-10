import { z } from "zod";

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  birthDate: z.date().nullable(),
  idNumber: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  idNumber: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
