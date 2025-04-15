import { z } from "zod";

export const employeeSchema = z.object({
    id: z.string(),
    userId: z.string(),
    position: z.string().nullable(),
    department: z.string().nullable(),
    image: z.string().nullable(),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }),
});

export const UserEmployeeSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    position: z.string(),
    department: z.string(),
    address: z.string(),
    phone: z.string(),
    birthDate: z.date(),
    idNumber: z.string(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }).optional(),
});

export type Employee = z.infer<typeof employeeSchema>;
export type UserEmployee = z.infer<typeof UserEmployeeSchema>; 