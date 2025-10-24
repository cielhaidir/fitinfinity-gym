import { postRouter } from "@/server/api/routers/post";
import { emailRouter } from "@/server/api/routers/email";
import { userRouter } from "@/server/api/routers/user";
import { authRouter } from "@/server/api/routers/auth";
import { createCallerFactory, createTRPCRouter, createModelLoggingMiddleware } from "@/server/api/trpc";
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
 * Helper function to wrap a router with logging middleware
 */
const withLogging = <T extends Record<string, any>>(router: T, modelName: string): T => {
  const middleware = createModelLoggingMiddleware(modelName);
  const wrappedRouter: any = {};
  
  for (const [key, value] of Object.entries(router)) {
    if (value && typeof value === 'object' && '_def' in value) {
      wrappedRouter[key] = value.use(middleware);
    } else {
      wrappedRouter[key] = value;
    }
  }
  
  return wrappedRouter as T;
};

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: withLogging(postRouter, 'post'),
  user: withLogging(userRouter, 'user'),
  member: withLogging(memberRouter, 'member'),
  personalTrainer: withLogging(personalTrainerRouter, 'personalTrainer'),
  permission: withLogging(permissionRouter, 'permission'),
  package: withLogging(packageRouter, 'package'),
  subs: withLogging(subscriptionRouter, 'subscription'),
  subscriptionImport: withLogging(subscriptionImportRouter, 'subscriptionImport'),
  role: withLogging(roleRouter, 'role'),
  rolePermission: withLogging(rolePermissionRouter, 'rolePermission'),
  class: withLogging(classRouter, 'class'),
  classType: withLogging(classTypeRouter, 'classType'),
  memberClass: withLogging(memberClassRouter, 'memberClass'),
  memberUc: withLogging(memberUcRouter, 'memberUc'),
  trainerSession: withLogging(trainerSessionRouter, 'trainerSession'),
  voucher: withLogging(voucherRouter, 'voucher'),
  reward: withLogging(rewardRouter, 'reward'),
  memberReward: withLogging(memberRewardRouter, 'memberReward'),
  employee: withLogging(employeeRouter, 'employee'),
  attendance: withLogging(attendanceRouter, 'attendance'),
  profile: withLogging(profileRouter, 'profile'),
  memberCalendar: withLogging(memberCalendarRouter, 'memberCalendar'),
  managerCalendar: withLogging(managerCalendarRouter, 'managerCalendar'),
  balanceAccount: withLogging(balanceAccountRouter, 'balanceAccount'),
  chartAccount: withLogging(chartAccountRouter, 'chartAccount'),
  paymentValidation: withLogging(paymentValidationRouter, 'paymentValidation'),
  transaction: withLogging(transactionRouter, 'transaction'),
  whatsapp: withLogging(whatsappRouter, 'whatsapp'),
  fc: withLogging(fcRouter, 'fc'),
  payment: withLogging(paymentRouter, 'payment'),
  email: withLogging(emailRouter, 'email'),
  auth: withLogging(authRouter, 'auth'),
  config: withLogging(configRouter, 'config'),
  fcMember: withLogging(fcMemberRouter, 'fcMember'),
  esp32: withLogging(esp32Router, 'esp32'),
  device: withLogging(deviceRouter, 'device'),
  posCategory: withLogging(posCategoryRouter, 'posCategory'),
  posItem: withLogging(posItemRouter, 'posItem'),
  posSale: withLogging(posSaleRouter, 'posSale'),
  mqtt: withLogging(mqttRouter, 'mqtt'),
  tracking: withLogging(trackingRouter, 'tracking'),
  salesReport: withLogging(salesReportRouter, 'salesReport'),
  cashBankReport: withLogging(cashBankReportRouter, 'cashBankReport'),
  aiRateLimit: withLogging(aiRateLimitRouter, 'aiRateLimit'),
  finance: withLogging(financeRouter, 'finance'),
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
