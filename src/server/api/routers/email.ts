import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
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
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const emailRouter = createTRPCRouter({
  createConfig: permissionProtectedProcedure(["create:email"])
    .input(emailConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const config = await ctx.db.emailConfig.create({
          data: input,
        });
        result = config;
        success = true;
        return config;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.createConfig",
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

  updateConfig: permissionProtectedProcedure(["update:email"])
    .input(
      z.object({
        id: z.string(),
        data: emailConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const config = await ctx.db.emailConfig.update({
          where: { id: input.id },
          data: input.data,
        });
        result = config;
        success = true;
        return config;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.updateConfig",
          method: "PATCH",
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

  deleteConfig: permissionProtectedProcedure(["delete:email"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const config = await ctx.db.emailConfig.delete({
          where: { id: input.id },
        });
        result = config;
        success = true;
        return config;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.deleteConfig",
          method: "DELETE",
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

  listConfigs: permissionProtectedProcedure(["list:email"]).query(async ({ ctx }) => {
    return ctx.db.emailConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getConfig: permissionProtectedProcedure(["show:email"])
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

  setActiveConfig: permissionProtectedProcedure(["activate:email"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // First, set all configs to inactive
        await ctx.db.emailConfig.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });

        // Then set the selected config to active
        const config = await ctx.db.emailConfig.update({
          where: { id: input.id },
          data: { isActive: true },
        });
        result = config;
        success = true;
        return config;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.setActiveConfig",
          method: "PATCH",
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

  testConnection: permissionProtectedProcedure(["test:email"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
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

          result = { success: true };
          success = true;
          return result;
        } catch (verifyError) {
          result = {
            success: false,
            error:
              verifyError instanceof Error ? verifyError.message : "Unknown error occurred",
          };
          success = true; // Connection test completed, even if failed
          return result;
        }
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.testConnection",
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

  createTemplate: permissionProtectedProcedure(["create:email"])
    .input(emailTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const template = await ctx.db.emailTemplate.create({
          data: input,
        });
        result = template;
        success = true;
        return template;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.createTemplate",
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

  updateTemplate: permissionProtectedProcedure(["update:email"])
    .input(
      z.object({
        id: z.string(),
        data: emailTemplateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const template = await ctx.db.emailTemplate.update({
          where: { id: input.id },
          data: input.data,
        });
        result = template;
        success = true;
        return template;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.updateTemplate",
          method: "PATCH",
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

  deleteTemplate: permissionProtectedProcedure(["delete:email"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const template = await ctx.db.emailTemplate.delete({
          where: { id: input.id },
        });
        result = template;
        success = true;
        return template;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.deleteTemplate",
          method: "DELETE",
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

  listTemplates: permissionProtectedProcedure(["list:email"]).query(async ({ ctx }) => {
    return ctx.db.emailTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getTemplate: permissionProtectedProcedure(["show:email"])
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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Find user by email
        const user = await ctx.db.user.findUnique({
          where: { email: input.email },
        });

        if (!user) {
          // Return success even if user not found for security
          result = { success: true };
          success = true;
          return result;
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
            to: user.email ?? '',
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

          result = { success: true };
          success = true;
          return result;
        } catch (sendError) {
          console.error("Failed to send password reset email:", sendError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send password reset email",
          });
        }
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "email.sendPasswordResetEmail",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: { email: input.email },
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),
});
