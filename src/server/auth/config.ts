import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { uploadProfilePictureFromBuffer } from "@/utils/minio";
import { db } from "@/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    // DiscordProvider,
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }

      // if (user.image) {
      //   try {
      //     const res = await fetch(user.image); // Ambil gambar dari Google
      //     const buffer = await res.arrayBuffer();
      //     const fileBuffer = Buffer.from(buffer);
      //     const fileName = `profile-${user.id}-${Date.now()}.jpg`;

      //     // Upload ke MinIO
      //     const minioUrl = await uploadProfilePictureFromBuffer(
      //       "profile-pictures",
      //       fileName,
      //       fileBuffer,
      //       "image/jpeg"
      //     );

      //     token.picture = minioUrl; 
      //   } catch (error) {
      //     console.error("Error uploading profile picture to MinIO:", error);
      //   }
      // }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // session.user.image = token.picture as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
