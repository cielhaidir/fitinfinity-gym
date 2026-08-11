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
  phone: z.string().min(1, "Phone is required"),
  birthDate: z.date({ required_error: "Birth date is required" }),
  idNumber: z.string().optional(),
  height: z.number({ required_error: "Height is required" }).min(1, "Height is required"),
  weight: z.number({ required_error: "Weight is required" }).min(1, "Weight is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
