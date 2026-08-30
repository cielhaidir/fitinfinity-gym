import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";

export const pointHistoryRouter = createTRPCRouter({
  // Member: get own point history
  myHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const skip = (input.page - 1) * input.limit;

      const [items, total, user] = await Promise.all([
        ctx.db.pointHistory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.limit,
        }),
        ctx.db.pointHistory.count({ where: { userId } }),
        ctx.db.user.findUnique({
          where: { id: userId },
          select: { point: true, name: true },
        }),
      ]);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        currentBalance: user?.point ?? 0,
      };
    }),

  // Admin: get any member's point history
  listByUser: permissionProtectedProcedure(["list:point-history"])
    .input(
      z.object({
        userId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        type: z.string().optional(),
        source: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const where: any = { userId: input.userId };
      if (input.type) where.type = input.type;
      if (input.source) where.source = input.source;
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = input.startDate;
        if (input.endDate) {
          const end = new Date(input.endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      const [items, total, user] = await Promise.all([
        ctx.db.pointHistory.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: input.limit,
          include: {
            user: { select: { name: true, email: true } },
          },
        }),
        ctx.db.pointHistory.count({ where }),
        ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { point: true, name: true, email: true },
        }),
      ]);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        currentBalance: user?.point ?? 0,
        userName: user?.name,
        userEmail: user?.email,
      };
    }),

  // Admin: list all point history (paginated, with filters)
  listAll: permissionProtectedProcedure(["list:point-history"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        type: z.string().optional(),
        source: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const where: any = {};
      if (input.type) where.type = input.type;
      if (input.source) where.source = input.source;
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = input.startDate;
        if (input.endDate) {
          const end = new Date(input.endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
      if (input.search) {
        where.user = {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
          ],
        };
      }

      const [items, total] = await Promise.all([
        ctx.db.pointHistory.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: input.limit,
          include: {
            user: { select: { name: true, email: true, point: true } },
          },
        }),
        ctx.db.pointHistory.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),
});
