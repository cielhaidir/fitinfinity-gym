import { z } from "zod";

export const employeeSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    position: z.string().optional(),
    department: z.string().optional(),
    image: z.string().optional(),
    isActive: z.boolean().default(true),
    user: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        address: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.date().optional(),
        idNumber: z.string().optional(),
    }).optional(),
});

export type Employee = z.infer<typeof employeeSchema>;

export type UserEmployee = {
    id?: string;
    userId: string;
    position?: string;
    department?: string;
    image?: string;
    isActive: boolean;
    user: {
        name: string;
        email: string;
        address?: string;
        phone?: string;
        birthDate?: Date;
        idNumber?: string;
    };
}; 