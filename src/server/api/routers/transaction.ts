import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { format } from "date-fns";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const transactionRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:transaction"])
    .input(
      z.object({
        bank_id: z.number(),
        account_id: z.number(),
        type: z.string(),
        file: z.string(),
        description: z.string(),
        transaction_date: z.date(),
        amount: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate transaction number with format TRyy-mm-increment
      const today = new Date();
      const yearPart = format(today, "yy");
      const monthPart = format(today, "MM");

      // Get the latest transaction in the current month to determine the increment
      const latestTransaction = await ctx.db.transaction.findFirst({
        where: {
          transaction_number: {
            startsWith: `TR${yearPart}-${monthPart}`,
          },
        },
        orderBy: {
          transaction_number: "desc",
        },
      });

      let increment = 1;
      if (latestTransaction) {
        // Extract the increment part from the transaction number
        const parts = latestTransaction.transaction_number.split("-");
        if (parts.length === 3) {
          increment = parseInt(parts[2] ?? "0") + 1;
        }
      }

      // Format increment with leading zeros (e.g. 001, 002, etc.)
      const incrementPart = increment.toString().padStart(3, "0");
      const transaction_number = `TR${yearPart}-${monthPart}-${incrementPart}`;

      return ctx.db.transaction.create({
        data: {
          bank_id: input.bank_id,
          account_id: input.account_id,
          type: input.type,
          file: input.file,
          description: input.description,
          transaction_date: input.transaction_date,
          transaction_number: transaction_number,
          amount: input.amount,
        },
        include: {
          bank: true,
          account: true,
        },
      });
    }),

  update: permissionProtectedProcedure(["edit:transaction"])
    .input(
      z.object({
        id: z.number(),
        bank_id: z.number(),
        account_id: z.number(),
        type: z.string(),
        file: z.string(),
        description: z.string(),
        transaction_date: z.date(),
        amount: z.number(),
        closed_at: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // When updating, don't change the transaction number
      return ctx.db.transaction.update({
        where: { id: input.id },
        data: {
          bank_id: input.bank_id,
          account_id: input.account_id,
          type: input.type,
          file: input.file,
          description: input.description,
          transaction_date: input.transaction_date,
          amount: input.amount,
          closed_at: input.closed_at,
        },
        include: {
          bank: true,
          account: true,
        },
      });
    }),

  list: permissionProtectedProcedure(["list:transaction"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where =
        input.search && input.searchColumn
          ? {
              [input.searchColumn]: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            }
          : {};

      const items = await ctx.db.transaction.findMany({
        where,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { transaction_date: "desc" },
        include: {
          bank: true,
          account: true,
        },
      });

      const total = await ctx.db.transaction.count({ where });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  remove: permissionProtectedProcedure(["delete:transaction"])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction.delete({
        where: { id: input.id },
      });
    }),

  uploadFile: permissionProtectedProcedure(["create:transaction"])
    .input(
      z.object({
        fileData: z.string(), // base64 string
        fileName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Remove data URL prefix if present
        const base64Data = input.fileData.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Generate a unique filename
        const extension = path.extname(input.fileName);
        const uniqueFilename = `${uuidv4()}${extension}`;

        // Construct the path relative to the public directory
        const relativeUploadDir = path.join(
          "assets",
          "management",
          "transaction",
        );
        const uploadDir = path.join(process.cwd(), "public", relativeUploadDir);
        const filePath = path.join("/", relativeUploadDir, uniqueFilename);

        // Create directory if it doesn't exist
        await mkdir(uploadDir, { recursive: true });

        // Write the file
        await writeFile(path.join(uploadDir, uniqueFilename), buffer);

        return {
          success: true,
          filePath: filePath,
          message: "File uploaded successfully",
        };
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    }),
});
