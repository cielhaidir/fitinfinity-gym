import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { uploadProfileImage } from "@/utils/minio";
import { createModelLogger } from "@/utils/logger";
import { hash } from "bcryptjs";

const userLogger = createModelLogger("User");

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  fcId: z.string().nullable(),
});

// Add this query to your existing user router

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, email, password, address, phone, birthDate, fcId } = input;

      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await hash(password, 12);

      // Create user and membership in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            address,
            phone,
            birthDate,
          },
        });

        // Find Member role
        const memberRole = await tx.role.findUnique({
          where: { name: "Member" },
        });

        if (memberRole) {
          // Assign Member role
          await tx.user.update({
            where: { id: user.id },
            data: {
              roles: {
                connect: { id: memberRole.id },
              },
            },
          });
        }

        // Create membership with FC ID if provided
        await tx.membership.create({
          data: {
            userId: user.id,
            registerDate: new Date(),
            isActive: true,
            fcId: fcId || null,
          },
        });

        return user;
      });

      return result;
    }),

  read: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.user.findUnique({
        where: { id: input.id },
      });
    }),

  update: permissionProtectedProcedure(["update:user"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.date().optional(),
        idNumber: z.string().optional(),
        roleIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sessionUserId = ctx.session.user.id;
      const sessionUserName = ctx.session.user.name;

      try {
        const user = await ctx.db.user.update({
          where: { id: input.id },
          data: {
            name: input.name,
            email: input.email,
            address: input.address,
            phone: input.phone,
            birthDate: input.birthDate,
            idNumber: input.idNumber,
            roles: input.roleIds
              ? {
                  set: [], // First disconnect all roles
                  connect: input.roleIds.map((id) => ({ id })), // Then connect new roles
                }
              : undefined,
          },
        });
        userLogger.info(
          `User ${sessionUserName} (${sessionUserId}) successfully updated user: ${JSON.stringify(user)}`,
        );
        return user;
      } catch (error) {
        userLogger.error(
          `User ${sessionUserName} (${sessionUserId}) encountered an error while updating user: ${(error as Error).message}`,
        );
        throw error;
      }
    }),

  delete: permissionProtectedProcedure(["delete:user"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sessionUserId = ctx.session.user.id;
      const sessionUserName = ctx.session.user.name;

      try {
        const user = await ctx.db.user.delete({
          where: { id: input.id },
        });
        userLogger.info(
          `User ${sessionUserName} (${sessionUserId}) successfully deleted user with ID: ${input.id}`,
        );
        return user;
      } catch (error) {
        userLogger.error(
          `User ${sessionUserName} (${sessionUserId}) encountered an error while deleting user: ${(error as Error).message}`,
        );
        throw error;
      }
    }),

  all: permissionProtectedProcedure(["list:user"]).query(async ({ ctx }) => {
    return await ctx.db.user.findMany();
  }),

  list: permissionProtectedProcedure(["list:user"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.search
        ? {
            [input.searchColumn ?? ""]: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          }
        : {};

      const items = await ctx.db.user.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          roles: true,
        },
      });

      const total = await ctx.db.user.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),
  getUserWithRoles: permissionProtectedProcedure(["show:user"]).query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return user;
  }),
  getById: permissionProtectedProcedure(["show:user"])
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: {
          id: input.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          point: true,
          image: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),

  search: permissionProtectedProcedure(["list:user"])
    .input(
      z.object({
        query: z.string().min(3, "Search query must be at least 3 characters"),
        excludeUserIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = {
        AND: [
          {
            OR: [
              {
                name: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
          input.excludeUserIds && input.excludeUserIds.length > 0
            ? {
                id: {
                  notIn: input.excludeUserIds,
                },
              }
            : {},
        ],
      };

      const users = await ctx.db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 10, // Limit results for performance
        orderBy: { name: "asc" },
      });

      return users;
    }),
});
