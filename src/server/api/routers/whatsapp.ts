import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import jwt from "jsonwebtoken";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

const apiUrl = process.env.WHATSAPP_API_URL!;
const username = process.env.WHATSAPP_API_USERNAME!;
const password = process.env.WHATSAPP_API_PASSWORD!;

const basicAuth =
  "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

async function reconnectWhatsApp() {
  const response = await fetch(apiUrl + "/app/reconnect", {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: basicAuth,
    },
  });

  const result = await response.json();
  return result.code === "SUCCESS";
}

async function sendWhatsAppMessage(formattedPhone: string, message: string) {
  let response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: formattedPhone,
      message: message,
    }),
  });

  // If first attempt fails, try reconnecting
  if (!response.ok) {
    const reconnected = await reconnectWhatsApp();
    if (reconnected) {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: basicAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }

  console.log("Message sent successfully", response);
  return response.json();
}

export const whatsappRouter = createTRPCRouter({
  sendMessage: permissionProtectedProcedure(["send:whatsapp"])
    .input(
      z.object({
        phone: z.string(), // e.g., '6281234567890'
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const formattedPhone = `${input.phone}@s.whatsapp.net`;
        result = await sendWhatsAppMessage(formattedPhone, input.message);
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "whatsapp.sendMessage",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: { phone: input.phone, messageLength: input.message.length },
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  sendResetPasswordLink: publicProcedure
    .input(
      z.object({
        phone: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const user = await db.user.findFirst({
          where: {
            phone: input.phone,
          },
        });
        if (!user) throw new Error("User not found");

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
          expiresIn: "1h",
        });

        const link = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

        const formattedPhone = `${input.phone}@s.whatsapp.net`;
        result = await sendWhatsAppMessage(
          formattedPhone,
          `Click to reset your password: ${link}`,
        );
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "whatsapp.sendResetPasswordLink",
          method: "POST",
          userId: null,
          requestData: { phone: input.phone },
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
