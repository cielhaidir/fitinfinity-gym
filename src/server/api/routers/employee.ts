import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { employeeSchema } from "@/app/(authenticated)/management/employee/schema";

export const employeeRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1),
        search: z.string(),
        searchColumn: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn } = input;
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        ctx.db.employee.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: true,
          },
        }),
        ctx.db.employee.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    }),

  create: permissionProtectedProcedure(["create:employees"])
    .input(employeeSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, position, department, image, isActive } = input;

      return ctx.db.employee.create({
        data: {
          userId,
          position,
          department,
          image,
          isActive,
        },
      });
    }),

  update: permissionProtectedProcedure(["edit:employees"])
    .input(
      z.object({
        id: z.string(),
        position: z.string().optional(),
        department: z.string().optional(),
        image: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.db.employee.update({
        where: { id },
        data,
      });
    }),

  delete: permissionProtectedProcedure(["delete:employees"])
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employee.delete({
        where: { id: input },
      });
    }),
});
