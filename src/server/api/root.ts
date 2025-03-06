import { postRouter } from "@/server/api/routers/post";
import { userRouter } from "@/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { memberRouter } from "./routers/member";
import { personalTrainerRouter } from "./routers/personalTrainer";
import { permissionRouter } from "./routers/permission";
import { packageRouter } from "./routers/package";
import { subscriptionRouter } from "./routers/subscription";
import { roleRouter } from "./routers/role";
import { rolePermissionRouter } from "./routers/role-permission";
import { classRouter } from "./routers/class";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
  member: memberRouter,
  personalTrainer: personalTrainerRouter,
  permission: permissionRouter,
  package: packageRouter,
  subs: subscriptionRouter,
  role: roleRouter,
  rolePermission: rolePermissionRouter,
  class: classRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
