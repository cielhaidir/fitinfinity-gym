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
        file: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.date().optional(),
        idNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        const sessionUserId = ctx.session.user.id;
        const sessionUserName = ctx.session.user.name;

        const file = input.file;

        if (!file.startsWith("data:") || !file.includes(";base64,")) {
            throw new Error("Invalid file format");
        }

        const [fileType, fileContent] = file.split(",");
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
            const image = await uploadProfileImage(sessionUserId, fileName, fileContent);
            const user = await ctx.db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    image: image,
                },
            });
            userLogger.info(
                `User ${sessionUserName} (${sessionUserId}) successfully created a user at ${new Date().toISOString()}: ${JSON.stringify(user)}`
            );
            return user;
        } catch (error) {
            userLogger.error(
                `User ${sessionUserName} (${sessionUserId}) encountered an error at ${new Date().toISOString()} while creating a user: ${(error as Error).message}`
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

});
