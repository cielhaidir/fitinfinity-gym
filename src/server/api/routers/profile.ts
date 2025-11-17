import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { uploadFile } from "@/lib/upload";
import bcrypt from "bcryptjs";

export const profileRouter = createTRPCRouter({
  get: permissionProtectedProcedure(["show:profile"])
    .input(
      z.object({
        memberId: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      // If memberId is provided, check if user has permission to view other members
      if (input?.memberId) {
        // Check if user has admin permissions to view other members

        const hasAdminPermission = ctx.permissions?.includes("manage:member")
        // console.log("Checking permissions for member profile access:", ctx.permissions);
        if (!hasAdminPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to view other members' profiles",
          });
        }

        // Fetch the requested member's profile
        const user = await ctx.db.membership.findUnique({
          where: { id: input.memberId },
          include: {
            user: true,
          }
        });

        // console.


        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        return user?.user;
      }

      // Default behavior: fetch current user's profile
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          phone: true,
          address: true,
          birthDate: true,
          point: true,
          createdAt: true,
          updatedAt: true,
          height: true,
          weight: true,
          gender: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  update: permissionProtectedProcedure(["update:profile"])
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        birthDate: z.date().optional(),
        image: z.string().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          phone: input.phone,
          address: input.address,
          birthDate: input.birthDate,
          image: input.image,
          height: input.height,
          weight: input.weight,
          gender: input.gender,
        },
      });
    }),

  uploadImage: permissionProtectedProcedure(["update:profile"])
    .input(
      z.object({
        file: z
          .string()
          .refine(
            (val) => val.startsWith("data:image/"),
            "File must be an image",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate a temporary filename
        const tempFileName = `profile-${Date.now()}.jpg`;

        // Upload the file
        const imageUrl = await uploadFile(input.file, tempFileName);

        // Update user profile with new image URL
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { image: imageUrl },
        });

        return { imageUrl };
      } catch (error) {
        console.error("Profile image upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to upload image",
        });
      }
    }),

  uploadPTPhoto: permissionProtectedProcedure(["update:profile"])
    .input(
      z.object({
        file: z
          .string()
          .refine(
            (val) => val.startsWith("data:image/"),
            "File must be an image",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is a PT
        const pt = await ctx.db.personalTrainer.findFirst({
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
        });

        if (!pt) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Only personal trainers can upload PT photos",
          });
        }

        // Generate a temporary filename
        const tempFileName = `pt-profile-${Date.now()}.jpg`;

        // Upload the file
        const imageUrl = await uploadFile(input.file, tempFileName);

        // Update PT profile with new image URL
        await ctx.db.personalTrainer.update({
          where: { id: pt.id },
          data: { image: imageUrl },
        });

        return { imageUrl };
      } catch (error) {
        console.error("PT profile image upload error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to upload image",
        });
      }
    }),

  changePassword: permissionProtectedProcedure(["update:profile"])
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
          .string()
          .min(6, "New password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        input.currentPassword,
        user.password!,
      );

      if (!isPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          password: hashedPassword,
        },
      });

      return { success: true };
    }),

  // Admin endpoint to update member points
  updatePoints: permissionProtectedProcedure(["update:member"])
    .input(
      z.object({
        memberId: z.string(),
        points: z.number().min(0, "Points must be a non-negative number"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the membership to get the user ID
      const membership = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Update the user's points
      return ctx.db.user.update({
        where: { id: membership.userId },
        data: { point: input.points },
      });
    }),

  // Admin endpoint to update member profiles
  updateMember: permissionProtectedProcedure(["update:member"])
    .input(
      z.object({
        memberId: z.string(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        birthDate: z.date().optional(),
        image: z.string().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the membership to get the user ID
      const membership = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      const { memberId, ...updateData } = input;

      return ctx.db.user.update({
        where: { id: membership.userId },
        data: updateData,
      });
    }),

  // Admin endpoint to change password without requiring current password
  adminChangePassword: permissionProtectedProcedure(["update:member"])
    .input(
      z.object({
        memberId: z.string().optional(), // For admin changing member password
        newPassword: z
          .string()
          .min(6, "New password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let userId = ctx.session.user.id;

      // If memberId is provided, admin is changing another user's password
      if (input.memberId) {
        const membership = await ctx.db.membership.findUnique({
          where: { id: input.memberId },
        });

        if (!membership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        userId = membership.userId;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      });

      return { success: true };
    }),

  // Account transfer functionality
  transferAccount: permissionProtectedProcedure(["update:member"])
    .input(
      z.object({
        fromUserId: z.string(),
        toUserEmail: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        // Find the target user by email
        const toUser = await tx.user.findUnique({
          where: { email: input.toUserEmail },
        });

        if (!toUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target user not found",
          });
        }

        // Find the from user's account records
        const fromAccounts = await tx.account.findMany({
          where: { userId: input.fromUserId },
        });

        if (fromAccounts.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No accounts found for the source user",
          });
        }

        // Transfer all accounts to the new user
        for (const account of fromAccounts) {
          await tx.account.update({
            where: { id: account.id },
            data: { userId: toUser.id },
          });
        }

        // Update sessions if any exist
        await tx.session.updateMany({
          where: { userId: input.fromUserId },
          data: { userId: toUser.id },
        });

        return {
          success: true,
          transferredAccounts: fromAccounts.length,
          toUserId: toUser.id,
        };
      });
    }),

  checkPhone: publicProcedure
    .input(
      z.object({
        phone: z
          .string()
          .refine((val) => {
            // Allow empty string (no validation needed for empty phone)
            if (val === "" || val === null || val === undefined) {
              return true;
            }
            // For non-empty values, apply validation
            return val.length >= 10 && /^\d+$/.test(val);
          }, "Phone number must be at least 10 digits and contain only digits"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // If phone is empty, return false (not taken)
      if (!input.phone || input.phone === "") {
        return false;
      }
      
      const user = await ctx.db.user.findFirst({
        where: { phone: input.phone },
      });
      return !!user;
    }),
});
