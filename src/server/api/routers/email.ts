import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  emailConfigSchema,
  emailTemplateSchema,
  EmailType,
} from "@/app/(authenticated)/management/config/email/schema";
import { TRPCError } from "@trpc/server";
import { smtp } from "@/lib/email/smtpProvider";
import { emailService } from "@/lib/email/emailService";
import { randomBytes } from "crypto";

export const emailRouter = createTRPCRouter({
  createConfig: protectedProcedure
    .input(emailConfigSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailConfig.create({
        data: input,
      });
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: emailConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailConfig.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteConfig: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailConfig.delete({
        where: { id: input.id },
      });
    }),

  listConfigs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.emailConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getConfig: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.emailConfig.findUnique({
        where: { id: input.id },
      });

      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email configuration not found",
        });
      }

      return config;
    }),

  setActiveConfig: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First, set all configs to inactive
      await ctx.db.emailConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Then set the selected config to active
      return ctx.db.emailConfig.update({
        where: { id: input.id },
        data: { isActive: true },
      });
    }),

  testConnection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.emailConfig.findUnique({
        where: { id: input.id },
      });

      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email configuration not found",
        });
      }

      try {
        await smtp.verifyConnection({
          host: config.host,
          port: config.port,
          secure: config.useSSL,
          auth: {
            user: config.username,
            pass: config.password,
          },
        });

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  createTemplate: protectedProcedure
    .input(emailTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.create({
        data: input,
      });
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: emailTemplateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.delete({
        where: { id: input.id },
      });
    }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.emailTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.emailTemplate.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        });
      }

      return template;
    }),

  sendPasswordResetEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        resetBaseUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find user by email
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        // Return success even if user not found for security
        return { success: true };
      }

      // Generate reset token and save it
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Find password reset template
      const template = await ctx.db.emailTemplate.findFirst({
        where: { type: EmailType.PASSWORD_RESET },
      });

      if (!template) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Password reset template not found",
        });
      }

      // Generate reset URL
      const resetUrl = `${input.resetBaseUrl}?token=${resetToken}`;

      try {
        await emailService.sendTemplateEmail({
          to: user.email,
          templateId: template.id,
          templateData: {
            name: user.name || "User",
            resetUrl,
            email: user.email,
            expiryTime: "2",
            supportEmail: "support@fitinfinity.com",
            supportPhone: "+1234567890",
            logoUrl: "https://dev.fitinfinity.id/assets/fitinfinity-lime.png",
            currentYear: new Date().getFullYear(),
            address: "123 Gym Street, Fitness City",
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send password reset email",
        });
      }
    }),
});
