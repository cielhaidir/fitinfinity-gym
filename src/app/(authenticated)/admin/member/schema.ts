import { z } from "zod";

export const memberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    birthDate: z.date().nullable(),
    idNumber: z.string().nullable(),
  }),
  registerDate: z.date(),
  rfidNumber: z.string().nullable(),
  isActive: z.boolean().default(false),
  createdBy: z.string().nullable(),
  fc: z
    .object({
      id: z.string(),
      user: z.object({
        name: z.string().nullable(),
      }),
    })
    .nullable(),
  
  revokedAt: z.date().nullable(),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
  subscriptions: z.array(z.object({
      id: z.string(),
      startDate: z.date(),
      endDate: z.date().nullable(),
      isActive: z.boolean(),
      isFrozen: z.boolean().default(false),
      remainingSessions: z.number().nullable(),
      trainerId: z.string().nullable(),
      trainer: z
        .object({
          id: z.string(),
          user: z.object({
            name: z.string().nullable(),
          }),
        })
        .nullable(),
  }))
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z
    .string()
    .nullable()
    .transform((e) => (e === "" ? null : e)),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  birthDate: z.date().nullable(),
  idNumber: z.string().nullable(),
});

export const UserMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  birthDate: z.date().nullable(),
  idNumber: z.string().nullable(),
  rfidNumber: z.string().nullable(),
  fcId: z.string().nullable(),
  personalTrainerId: z.string().nullable(),
  registerDate: z.date().nullable(),
  subscriptionStartDate: z.date().nullable(),
  subscriptionEndDate: z.date().nullable(),
});

export type UserMember = z.infer<typeof UserMemberSchema>;
export type User = z.infer<typeof UserSchema>;
export type Member = z.infer<typeof memberSchema>;
