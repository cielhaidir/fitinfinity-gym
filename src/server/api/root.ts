import { postRouter } from "@/server/api/routers/post";
import { emailRouter } from "@/server/api/routers/email";
import { userRouter } from "@/server/api/routers/user";
import { authRouter } from "@/server/api/routers/auth";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { memberRouter } from "./routers/member";
import { personalTrainerRouter } from "./routers/personalTrainer";
import { permissionRouter } from "./routers/permission";
import { packageRouter } from "./routers/package";
import { subscriptionRouter } from "./routers/subscription";
import { subscriptionImportRouter } from "./routers/subscriptionImport";
import { roleRouter } from "./routers/role";
import { rolePermissionRouter } from "./routers/role-permission";
import { classRouter } from "./routers/class";
import { classTypeRouter } from "./routers/classType";
import { memberClassRouter } from "./routers/memberClass";
import { memberUcRouter } from "./routers/member-uc";
import { trainerSessionRouter } from "./routers/trainerSession";
import { voucherRouter } from "./routers/voucher";
import { rewardRouter } from "./routers/reward";
import { memberRewardRouter } from "./routers/memberReward";
import { employeeRouter } from "./routers/employee";
import { attendanceRouter } from "./routers/attendance";
import { profileRouter } from "./routers/profile";
import { memberCalendarRouter } from "@/server/api/routers/memberCalendar";
import { managerCalendarRouter } from "@/server/api/routers/managerCalendar";
import { fcMemberRouter } from "./routers/fc-member";
import { balanceAccountRouter } from "./routers/balanceAccount";
import { chartAccountRouter } from "./routers/chartAccount";
import { paymentValidationRouter } from "./routers/paymentValidation";
import { transactionRouter } from "./routers/transaction";
import { whatsappRouter } from "./routers/whatsapp";
import { fcRouter } from "./routers/fc";
import { paymentRouter } from "./routers/payment";
import { configRouter } from "./routers/config";
import { esp32Router } from "./routers/esp32";
import { deviceRouter } from "./routers/device";
import { posCategoryRouter } from "./routers/posCategory";
import { posItemRouter } from "./routers/posItem";
import { posSaleRouter } from "./routers/posSale";
import { mqttRouter } from "./routers/mqtt";
import { trackingRouter } from "./routers/tracking";
import { salesReportRouter } from "./routers/salesReport";
import { cashBankReportRouter } from "./routers/cashBankReport";
import { aiRateLimitRouter } from "./routers/aiRateLimit";
import { financeRouter } from "./routers/finance";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 *
 * Logging is applied automatically at the procedure level (publicProcedure, protectedProcedure, etc.)
 * All mutations (Create, Update, Delete) are automatically logged to model-specific files in logs/
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
  member: memberRouter,
  personalTrainer: personalTrainerRouter,
  permission: permissionRouter,
  package: packageRouter,
  subs: subscriptionRouter,
  subscriptionImport: subscriptionImportRouter,
  role: roleRouter,
  rolePermission: rolePermissionRouter,
  class: classRouter,
  classType: classTypeRouter,
  memberClass: memberClassRouter,
  memberUc: memberUcRouter,
  trainerSession: trainerSessionRouter,
  voucher: voucherRouter,
  reward: rewardRouter,
  memberReward: memberRewardRouter,
  employee: employeeRouter,
  attendance: attendanceRouter,
  profile: profileRouter,
  memberCalendar: memberCalendarRouter,
  managerCalendar: managerCalendarRouter,
  balanceAccount: balanceAccountRouter,
  chartAccount: chartAccountRouter,
  paymentValidation: paymentValidationRouter,
  transaction: transactionRouter,
  whatsapp: whatsappRouter,
  fc: fcRouter,
  payment: paymentRouter,
  email: emailRouter,
  auth: authRouter,
  config: configRouter,
  fcMember: fcMemberRouter,
  esp32: esp32Router,
  device: deviceRouter,
  posCategory: posCategoryRouter,
  posItem: posItemRouter,
  posSale: posSaleRouter,
  mqtt: mqttRouter,
  tracking: trackingRouter,
  salesReport: salesReportRouter,
  cashBankReport: cashBankReportRouter,
  aiRateLimit: aiRateLimitRouter,
  finance: financeRouter,
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
