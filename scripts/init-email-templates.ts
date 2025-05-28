import { promises as fs } from "fs";
import { join } from "path";
import { db } from "@/server/db";
import { EmailType } from "@prisma/client";

async function readTemplate(filename: string): Promise<string> {
  const content = await fs.readFile(
    join(process.cwd(), "src/lib/email/templates", filename),
    "utf-8"
  );
  return content;
}

async function main() {
  console.log("Initializing email templates...");

  const templates = [
    {
      name: "Member Registration",
      type: EmailType.MEMBERSHIP_CONFIRMATION,
      subject: "Welcome to Fit Infinity - Your Membership is Active!",
      htmlContent: await readTemplate("membership-confirmation.html"),
      variables: {
        memberName: "Member's full name",
        memberEmail: "Member's email address",
        membershipId: "Unique membership ID",
        packageName: "Name of the purchased package",
        startDate: "Membership start date",
        endDate: "Membership end date",
        personalTrainer: "Boolean indicating if PT is included",
        trainerName: "Name of assigned personal trainer",
        portalUrl: "URL to member portal",
      },
    },
    {
      name: "Payment Receipt",
      type: EmailType.PAYMENT_RECEIPT,
      subject: "Payment Receipt - Fit Infinity",
      htmlContent: await readTemplate("payment-receipt.html"),
      variables: {
        memberName: "Member's full name",
        memberEmail: "Member's email address",
        receiptNumber: "Unique receipt number",
        paymentDate: "Date of payment",
        paymentStatus: "Status of payment",
        packageName: "Name of the purchased package",
        duration: "Membership duration",
        paymentMethod: "Method of payment",
        totalAmount: "Total payment amount",
        currency: "Currency symbol",
        discount: "Discount amount if applicable",
      },
    },
    {
      name: "Password Reset",
      type: EmailType.PASSWORD_RESET,
      subject: "Reset Your Fit Infinity Password",
      htmlContent: await readTemplate("password-reset.html"),
      variables: {
        name: "User's name",
        email: "User's email",
        resetUrl: "Password reset URL",
        expiryTime: "Link expiry time in hours",
      },
    },
  ];

  for (const template of templates) {
    console.log(`Processing template: ${template.name}`);

    await db.emailTemplate.upsert({
      where: {
        name: template.name,
      },
      update: {
        subject: template.subject,
        htmlContent: template.htmlContent,
        variables: template.variables,
        type: template.type,
      },
      create: {
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        variables: template.variables,
        type: template.type,
      },
    });
  }

  console.log("Email templates initialized successfully!");
}

main()
  .catch((e) => {
    console.error("Error initializing email templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });