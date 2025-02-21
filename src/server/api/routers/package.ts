import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

const packageType = z.enum(["GYM_MEMBERSHIP", "PERSONAL_TRAINER"]);

export const packageRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
            description: z.string().optional(),
            price: z.number(),
            type: packageType,
            sessions: z.number().optional(),
            months: z.number().optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.package.create({
                data: input,
            });
        }),

    list: protectedProcedure
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

    detail: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.package.findUnique({
                where: { id: input.id },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            price: z.number(),
            type: packageType,
            sessions: z.number().optional(),
            months: z.number().optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.db.package.update({
                where: { id },
                data,
            });
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.package.delete({
                where: { id: input.id },
            });
        }),
});
