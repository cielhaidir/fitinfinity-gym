import { z } from "zod";

export const emailConfigSchema = z.object({
  // SMTP Settings
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Port is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "From name is required"),
  useTLS: z.boolean().default(true),
  useSSL: z.boolean().default(false),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),

  // Template Variables
  supportEmail: z
    .string()
    .email("Invalid support email")
    .default("support@fitinfinity.com"),
  supportPhone: z
    .string()
    .min(1, "Support phone is required")
    .default("+1234567890"),
  logoUrl: z
    .string()
    .url("Invalid logo URL")
    .default("https://fitinfinity.com/logo.png"),
  businessAddress: z
    .string()
    .min(1, "Business address is required")
    .default("123 Gym Street, Fitness City"),
  currency: z.string().min(1, "Currency is required").default("Rp"),
});

export type EmailConfig = z.infer<typeof emailConfigSchema> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Add the EmailConfigFormData type export
export type EmailConfigFormData = z.infer<typeof emailConfigSchema>;

export const EmailType = {
  MEMBERSHIP_CONFIRMATION: "MEMBERSHIP_CONFIRMATION",
  PAYMENT_RECEIPT: "PAYMENT_RECEIPT",
  PASSWORD_RESET: "PASSWORD_RESET",
  SUBSCRIPTION_EXPIRY: "SUBSCRIPTION_EXPIRY",
  TRAINER_SESSION_REMINDER: "TRAINER_SESSION_REMINDER",
} as const;

export const emailTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    EmailType.MEMBERSHIP_CONFIRMATION,
    EmailType.PAYMENT_RECEIPT,
    EmailType.PASSWORD_RESET,
    EmailType.SUBSCRIPTION_EXPIRY,
    EmailType.TRAINER_SESSION_REMINDER,
  ]),
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().min(1, "HTML content is required"),
  textContent: z.string().optional(),
  variables: z.record(z.string()), // Record of available template variables
  isActive: z.boolean().default(true),
});

export type EmailTemplate = z.infer<typeof emailTemplateSchema> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Common SMTP presets for popular email providers
export const SMTP_PRESETS = {
  gmail: {
    host: "smtp.gmail.com",
    port: 587,
    useTLS: true,
    useSSL: false,
  },
  outlook: {
    host: "smtp.office365.com",
    port: 587,
    useTLS: true,
    useSSL: false,
  },
  yahoo: {
    host: "smtp.mail.yahoo.com",
    port: 587,
    useTLS: true,
    useSSL: false,
  },
} as const;
