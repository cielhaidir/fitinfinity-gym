import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { uploadProfileImage } from "@/utils/minio";
import { createModelLogger } from "@/utils/logger";
import { add } from "winston";

const userLogger = createModelLogger("User");


export const userRouter = createTRPCRouter({
    
    create: protectedProcedure
    .input(z.object({ 
        name: z.string().min(1),
        email: z.string().email(),
        file: z.string().optional(), // File tetap opsional
        address: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.date().optional(),
        idNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        const sessionUserId = ctx.session.user.id;
        const sessionUserName = ctx.session.user.name;

        let image = null; // Default tanpa file

        if (input.file) {
            // Validasi format file hanya jika file ada
            if (!input.file.startsWith("data:") || !input.file.includes(";base64,")) {
                throw new Error("Invalid file format");
            }

            const [fileType, fileContent] = input.file.split(",");
            const mimeTypeMatch = fileType?.match(/data:(.*?);base64/);
            if (!mimeTypeMatch) {
                throw new Error("Invalid file type");
            }

            const mimeType = mimeTypeMatch[1];
            if (!mimeType) {
                throw new Error("Mime type is undefined");
            }

            const fileName = `${input.name}-${Date.now()}.${mimeType.split("/")[1]}`;

            try {
                image = await uploadProfileImage(sessionUserId, fileName, fileContent);
            } catch (error) {
                userLogger.error(
                    `User ${sessionUserName} (${sessionUserId}) encountered an error while uploading image: ${(error as Error).message}`
                );
                throw new Error(`Failed to upload image: ${(error as Error).message}`);
            }
        }

        try {
            // Buat user tanpa atau dengan gambar
            const user = await ctx.db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    image, // Jika `image` tetap null, kolom akan tetap kosong
                },
            });

            userLogger.info(
                `User ${sessionUserName} (${sessionUserId}) successfully created a user at ${new Date().toISOString()}: ${JSON.stringify(user)}`
            );

            return user;
        } catch (error) {
            userLogger.error(
                `User ${sessionUserName} (${sessionUserId}) encountered an error while creating a user: ${(error as Error).message}`
            );
            throw new Error(`Failed to create user: ${(error as Error).message}`);
        }
    }),



    read: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return await ctx.db.user.findUnique({
                where: { id: input.id },
            });
        }),

    update: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().optional(), email: z.string().email().optional() }))
        .mutation(async ({ ctx, input }) => {
            const sessionUserId = ctx.session.user.id;
            const sessionUserName = ctx.session.user.name;

            try {
                const user = await ctx.db.user.update({
                    where: { id: input.id },
                    data: {
                        name: input.name,
                        email: input.email,
                    },
                });
                userLogger.info(
                    `User ${sessionUserName} (${sessionUserId}) successfully updated user: ${JSON.stringify(user)}`
                );
                return user;
            } catch (error) {
                userLogger.error(
                    `User ${sessionUserName} (${sessionUserId}) encountered an error while updating user: ${(error as Error).message}`
                );
                throw error;
            }
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const sessionUserId = ctx.session.user.id;
            const sessionUserName = ctx.session.user.name;

            try {
                const user = await ctx.db.user.delete({
                    where: { id: input.id },
                });
                userLogger.info(
                    `User ${sessionUserName} (${sessionUserId}) successfully deleted user with ID: ${input.id}`
                );
                return user;
            } catch (error) {
                userLogger.error(
                    `User ${sessionUserName} (${sessionUserId}) encountered an error while deleting user: ${(error as Error).message}`
                );
                throw error;
            }
        }),

    all: protectedProcedure
        .query(async ({ ctx }) => {
            return await ctx.db.user.findMany();
        }),

    list: protectedProcedure
        .input(
            z.object({
                page: z.number().min(1),
                limit: z.number().min(1).max(100),
                search: z.string().optional(),
                searchColumn: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const whereClause = input.search
                ? {
                    [input.searchColumn ?? ""]: {
                        contains: input.search,
                        mode: "insensitive" as const
                    }
                }
                : {};

            const items = await ctx.db.user.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { createdAt: "desc" },
            });

            const total = await ctx.db.user.count({ where: whereClause });

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

});
