import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const corporateRouter = createTRPCRouter({
  /** List all corporates (for dropdowns and management) */
  list: permissionProtectedProcedure(["list:corporate", "manage:corporate", "list:subscription", "report:member-attendance"])
    .input(
      z.object({
        search: z.string().optional(),
        activeOnly: z.boolean().optional().default(false),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.activeOnly) where.isActive = true;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { contactPerson: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.corporate.findMany({
          where,
          orderBy: { name: "asc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.corporate.count({ where }),
      ]);

      return { items, total };
    }),

  /** Get single corporate by id */
  getById: permissionProtectedProcedure(["list:corporate", "manage:corporate", "list:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const corporate = await ctx.db.corporate.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { subscriptions: true } },
        },
      });
      if (!corporate) throw new TRPCError({ code: "NOT_FOUND", message: "Corporate tidak ditemukan" });
      return corporate;
    }),

  /** Create new corporate */
  create: permissionProtectedProcedure(["manage:corporate"])
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        contactPerson: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const existing = await ctx.db.corporate.findUnique({ where: { name: input.name } });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Nama corporate sudah ada" });

        result = await ctx.db.corporate.create({
          data: {
            name: input.name,
            address: input.address ?? null,
            phone: input.phone ?? null,
            email: input.email || null,
            contactPerson: input.contactPerson ?? null,
            notes: input.notes ?? null,
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "corporate.create",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /** Update corporate */
  update: permissionProtectedProcedure(["manage:corporate"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        contactPerson: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const existing = await ctx.db.corporate.findFirst({
          where: { name: input.name, NOT: { id: input.id } },
        });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Nama corporate sudah dipakai" });

        result = await ctx.db.corporate.update({
          where: { id: input.id },
          data: {
            name: input.name,
            address: input.address ?? null,
            phone: input.phone ?? null,
            email: input.email || null,
            contactPerson: input.contactPerson ?? null,
            notes: input.notes ?? null,
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "corporate.update",
          method: "PUT",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /** Toggle active status */
  toggleActive: permissionProtectedProcedure(["manage:corporate"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const corp = await ctx.db.corporate.findUnique({ where: { id: input.id } });
      if (!corp) throw new TRPCError({ code: "NOT_FOUND", message: "Corporate tidak ditemukan" });

      return ctx.db.corporate.update({
        where: { id: input.id },
        data: { isActive: !corp.isActive },
      });
    }),
});
