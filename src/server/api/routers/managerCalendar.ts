import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const managerCalendarRouter = createTRPCRouter({
  getAll: permissionProtectedProcedure(["list:session"]).query(async () => {
    return db.trainerSession.findMany({
      include: {
        member: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        trainer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });
  }),
});
