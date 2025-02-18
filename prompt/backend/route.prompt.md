file: prisma/schema.prisma

## CODE NOTE

    - Model is from schema prisma
    - the object is from the model defined in schema prisma
    - You will defined route with trpc

## Template For Schema

```typescript
import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";

export const modelRouter = createTRPCRouter({


    create: protectedProcedure
        .input(z.object({
            // Model column input, add nullable if it nullable
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.model.create({
                data: {
                    // model column
                },
            });
        }),

    edit: protectedProcedure
        .input(z.object({
            id: z.string(),
           // Model column input, add nullable if it nullable
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.model.update({
                where: { id: input.id },
                data: {
                    // Model column input
                },
            });
        }),

    detail: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.model.findUnique({
                where: { id: input.id },
            });
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            pageSize: z.number().min(1).max(100),
        }))
        .query(async ({ ctx, input }) => {
            const models = await ctx.db.model.findMany({
                skip: (input.page - 1) * input.pageSize,
                take: input.pageSize,
                orderBy: { createdAt: "desc" },
            });

            const total = await ctx.db.model.count();

            return {
                models,
                total,
                page: input.page,
                pageSize: input.pageSize,
            };
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.model.findUnique({
                where: { id: input.id },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
             // Model column input, add nullable if it nullable
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membership.update({
                where: { id: input.id },
                data: {
                     // Model column input, add nullable if it nullable
                },
            });
        }),

});

```
