import {
  EmailTemplate,
  type EmailConfig,
} from "@/app/(authenticated)/management/config/email/schema";
import { db } from "@/server/db";
import { smtp } from "./smtpProvider";
import { renderTemplate } from "./templateEngine";

export class EmailService {
  private static instance: EmailService;
  private activeConfig: EmailConfig | null = null;

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async initialize() {
    // Load active configuration
    const config = await db.emailConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      throw new Error("No active email configuration found");
    }

    this.activeConfig = config;
    await smtp.createTransporter(config);
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
    templateId,
    templateData,
  }: {
    to: string | string[];
    subject?: string;
    html?: string;
    text?: string;
    templateId?: string;
    templateData?: Record<string, any>;
  }) {
    try {
      if (!this.activeConfig) {
        await this.initialize();
      }

      console.log("Sending email with config:", this.activeConfig);
      let emailContent: { subject: string; html?: string; text?: string };

      let log;

      if (templateId) {
        const template = await db.emailTemplate.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          throw new Error(`Email template ${templateId} not found`);
        }

        emailContent = {
          subject: templateData
            ? renderTemplate(template.subject, templateData)
            : template.subject,
          html: templateData
            ? renderTemplate(template.htmlContent, templateData)
            : template.htmlContent,
          text:
            template.textContent && templateData
              ? renderTemplate(template.textContent, templateData)
              : template.textContent || undefined,
        };
      } else {
        if (!subject || !html) {
          throw new Error(
            "Subject and HTML content are required when not using a template",
          );
        }
        emailContent = { subject, html, text };
      }

      // Create email log entry
      log = await db.emailLog.create({
        data: {
          to: Array.isArray(to) ? to.join(", ") : to,
          subject: emailContent.subject,
          templateId,
          status: "PENDING",
        },
      });

      // Send email
      await smtp.sendMail({
        to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // Update log with success
      await db.emailLog.update({
        where: { id: log.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } catch (error) {
      // Handle error and update log if it exists
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // if (log?.id) {
      //   await db.emailLog.update({
      //     where: { id: log.id },
      //     data: {
      //       status: "FAILED",
      //       errorMessage,
      //     },
      //   });
      // }

      throw error;
    }
  }

  // Helper method to send template-based emails
  async sendTemplateEmail({
    to,
    templateId,
    templateData,
  }: {
    to: string | string[];
    templateId: string;
    templateData?: Record<string, any>;
  }) {
    return this.sendEmail({ to, templateId, templateData });
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
