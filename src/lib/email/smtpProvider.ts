import nodemailer, { type Transporter } from "nodemailer";
import type { Options } from "nodemailer/lib/smtp-connection";
import type { EmailConfig } from "@/app/(authenticated)/management/config/email/schema";

class SMTPProvider {
  private transporter: Transporter | null = null;
  private currentConfig: EmailConfig | null = null;

  async verifyConnection(config: Options): Promise<void> {
    const testTransporter = nodemailer.createTransport(config);
    await testTransporter.verify();
  }

  async createTransporter(config: EmailConfig): Promise<void> {
    if (
      this.transporter &&
      this.currentConfig &&
      this.currentConfig.id === config.id
    ) {
      return; // Reuse existing transporter if config hasn't changed
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.useSSL,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    this.currentConfig = config;
  }

  async sendMail(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    if (!this.transporter || !this.currentConfig) {
      throw new Error("SMTP transport not configured");
    }

    await this.transporter.sendMail({
      from: `${this.currentConfig.fromName} <${this.currentConfig.fromEmail}>`,
      ...options,
    });
  }
}

export const smtp = new SMTPProvider();
