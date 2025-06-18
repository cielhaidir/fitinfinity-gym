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
  get: permissionProtectedProcedure(["show:profile"]).query(async ({ ctx }) => {
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

  checkPhone: publicProcedure
    .input(
      z.object({
        phone: z
          .string()
          .min(10, "Phone number must be at least 10 digits")
          .regex(/^\d+$/, "Phone number must contain only digits"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { phone: input.phone },
      });
      return !!user;
    }),
});
