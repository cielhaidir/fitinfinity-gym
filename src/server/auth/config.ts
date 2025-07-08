import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { uploadProfileImage } from "@/utils/minio";
import bcrypt from "bcryptjs";

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
      permissions: string[];
      roles: string[];
      // ...other properties
      // role: UserRole;
      phone?: string;
    } & DefaultSession["user"];
  }

  // interface User {
//   id: string | undefined;
//   name?: string | null;
//   email?: string | null;
//   phone?: string | null;
//   // ...other properties
// }
}

// Helper function to create membership
async function createUserMembership(userId: string | undefined) {
  if (!userId) {
    console.error("Cannot create membership: User ID is undefined");
    return;
  }

  console.log("Starting membership creation for user:", userId);

  try {
    // Check if membership already exists
    const existingMembership = await db.membership.findUnique({
      where: { userId },
    });

    if (existingMembership) {
      console.log("Membership already exists for user:", userId);
      return existingMembership;
    }

    // Create membership
    const membership = await db.membership.create({
      data: {
        userId,
        registerDate: new Date(),
        isActive: true,
      },
    });

    console.log("Created membership:", membership.id);
    return membership;
  } catch (error) {
    console.error("Error creating user membership:", error);
    throw error;
  }
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
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Invalid credentials");
        }
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          throw new Error("No user found with the given email");
        }
        // Validate password
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password!,
        );
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
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
        // Add phone to token if available
        token.phone = (user as any).phone ?? "";
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
          session.user.name = token.name!;
          session.user.email = token.email!;
          // Add phone to session if available
          if (typeof token.phone === "string") {
            session.user.phone = token.phone;
          }
        // Fetch user's roles and permissions
        const user = await db.user.findUnique({
          where: { id: token.id as string },
          include: {
            roles: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        if (user && session.user) {
          const permissions = user.roles.flatMap((role) =>
            role.permissions.map((p) => p.permission.name),
          );
          session.user.permissions = [...new Set(permissions)];
          session.user.roles = user.roles.map((role) => role.name);
          // Always fetch phone from DB result
                    session.user.phone = (user as any).phone ?? "";
        }
        // Check and create membership if it doesn't exist
        try {
          const membership = await createUserMembership(token.id as string);
          if (membership) {
            console.log(
              "Membership check/creation completed for user:",
              token.id,
            );
          }
        } catch (error) {
          console.error(
            "Error checking/creating membership in session callback:",
            error,
          );
        }
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      console.log("Starting signIn callback for provider:", account?.provider);

      try {
        if (account?.provider === "google") {
          console.log("Processing Google sign in for email:", user.email);

          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
            include: { accounts: true, roles: true },
          });

          if (!existingUser) {
            console.error("User record not found after OAuth signup");
            try {
              const membership = await createUserMembership(user.id);
              console.log("Membership creation result from event:", membership);

              // Assign Member role only during initial user creation
              const memberRole = await db.role.findUnique({
                where: { name: "Member" },
              });
              if (memberRole) {
                await db.user.update({
                  where: { id: user.id },
                  data: { roles: { connect: { id: memberRole.id } } },
                });
                console.log("Assigned Member role to user:", user.id);
              }
            } catch (error) {
              console.error("Error in createUser event:", error);
            }
          } else {
            const hasGoogleAccount = existingUser.accounts?.some(
              (acc) => acc.provider === "google",
            );

            if (!hasGoogleAccount) {
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state
                    ? String(account.session_state)
                    : null,
                },
              });
              console.log("Google account linked for user:", existingUser.id);
              return true;
            }
          }
        }
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false; // Important: Returning false prevents sign-in
      }

      // console.log("Starting signIn callback for provider:", account?.provider);
      // try {
      //   if (account?.provider === "google") {
      //     console.log("Processing Google sign in for email:", user.email);

      //     const existingUser = await db.user.findUnique({
      //       where: { email: user.email as string },
      //       include: { accounts: true, roles: true },
      //     });
      //     if (!existingUser) {
      //       console.error("User record not found after OAuth signup");
      //       return false;
      //     }
      //     if (!existingUser.accounts.some((acc) => acc.provider === "google")) {
      //       await db.account.create({
      //         data: {
      //           userId: existingUser.id,
      //           type: account.type,
      //           provider: account.provider,
      //           providerAccountId: account.providerAccountId,
      //           access_token: account.access_token as string | null,
      //           token_type: account.token_type as string | null,
      //           scope: account.scope as string | null,
      //           id_token: account.id_token as string | null,
      //           session_state: account.session_state as string | null,
      //         },
      //       });
      //     }
      //   }
      //   return true;
      // } catch (error) {
      //   console.error("Error in signIn callback:", error);
      //   return false;
      // }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      console.log("createUser event triggered for user:", user.id);
      try {
        const membership = await createUserMembership(user.id);
        console.log("Membership creation result from event:", membership);

        // Assign Member role only during initial user creation
        const memberRole = await db.role.findUnique({
          where: { name: "Member" },
        });
        if (memberRole) {
          await db.user.update({
            where: { id: user.id },
            data: { roles: { connect: { id: memberRole.id } } },
          });
          console.log("Assigned Member role to user:", user.id);
        }
      } catch (error) {
        console.error("Error in createUser event:", error);
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signin",
    error: "/auth/error", // Error code passed in query string as ?error=
    verifyRequest: "/auth/verify-request", // (used for check email message)
    // Remove the newUser line below if you don't have this page implemented
    // newUser: "/auth/new-user",
  },
} satisfies NextAuthConfig;
