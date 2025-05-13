import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    permissionProtectedProcedure
} from "@/server/api/trpc";

const packageType = z.enum(["GYM_MEMBERSHIP", "PERSONAL_TRAINER"]);

export const packageRouter = createTRPCRouter({

    create: protectedProcedure
        .input(z.object({
            name: z.string(),
            description: z.string().optional(),
            price: z.number(),
            point: z.number(),
            type: packageType,
            sessions: z.number().nullish(),
            day: z.number().nullish(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.package.create({
                data: {
                    ...input,
                    sessions: input.sessions ?? null,
                    day: input.day ?? null,
                    point: input.point,
                }
            });
        }),

    list: permissionProtectedProcedure(['list:packages'])
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
            search: z.string().optional(),
            type: packageType.optional(),
        }))
        .query(async ({ ctx, input }) => {
            const where = {
                AND: [
                    input.search ? {
                        OR: [
                            { name: { contains: input.search, mode: "insensitive" as const } },
                            { description: { contains: input.search, mode: "insensitive" as const } },
                        ],
                    } : {},
                    input.type ? { type: input.type } : {},
                ],
            };

            const items = await ctx.db.package.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where,
                orderBy: { createdAt: "desc" },
            });
            const total = await ctx.db.package.count({ where });

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    detail: permissionProtectedProcedure(['list:packages'])
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.package.findUnique({
                where: { id: input.id },
            });
        }),

    update: permissionProtectedProcedure(['edit:packages'])
        .input(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            price: z.number(),
            point: z.number(),
            type: z.enum(['GYM_MEMBERSHIP', 'PERSONAL_TRAINER']),
            sessions: z.number().nullable(),
            day: z.number().nullable(),
            isActive: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            
            return ctx.db.package.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    point: data.point,
                    type: data.type,
                    sessions: data.sessions,
                    day: data.day,
                    isActive: data.isActive,
                }
            });
        }),

    remove: permissionProtectedProcedure(['delete:packages'])
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.package.delete({
                where: { id: input.id },
            });
        }),

    listActive: permissionProtectedProcedure(['list:packages'])
        .query(async ({ ctx }) => {
            return ctx.db.package.findMany({
                where: { isActive: true },
            });
        }),

    listByType: permissionProtectedProcedure(['list:packages'])
        .input(z.object({ type: packageType }))
        .query(async ({ ctx, input }) => {
            return ctx.db.package.findMany({
                where: { type: input.type },
            });
        }),
});
