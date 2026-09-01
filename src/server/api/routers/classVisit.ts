import { z } from "zod";
import { TRPCError } from "@trpc/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";
import { decrementClassSessionFIFO } from "@/server/utils/ptSubscriptionUtils";
import { logPointHistory } from "@/server/helpers/pointHistory";

export const classVisitRouter = createTRPCRouter({
  /**
   * Register a member for a class visit.
   * - If member has an active GYM_MEMBERSHIP subscription → auto CONFIRMED + FREE
   * - Otherwise → PENDING_PAYMENT, admin must validate payment
   */
  register: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        classId: z.string(),
        memberId: z.string(), // Membership.id
        paymentMethod: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Validate class exists
        const cls = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: {
            classVisitRegistrations: {
              where: { status: { not: "CANCELLED" } },
            },
          },
        });

        if (!cls) throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" });

        // Validate member exists
        const membership = await ctx.db.membership.findUnique({
          where: { id: input.memberId },
          include: { user: { select: { name: true } } },
        });

        if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Member tidak ditemukan" });

        // Check capacity (ClassMember + ClassVisitRegistration combined)
        if (cls.limit !== null) {
          const classMembers = await ctx.db.classMember.count({ where: { classId: input.classId } });
          const visitConfirmed = cls.classVisitRegistrations.filter(
            (r) => r.status === "CONFIRMED" || r.status === "ATTENDED",
          ).length;
          if (classMembers + visitConfirmed >= cls.limit) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Kapasitas kelas sudah penuh" });
          }
        }

        // Check duplicate (class visit)
        const existing = await ctx.db.classVisitRegistration.findUnique({
          where: { classId_memberId: { classId: input.classId, memberId: input.memberId } },
        });
        if (existing && existing.status !== "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Member sudah terdaftar di kelas ini" });
        }

        // Cross-check: already registered via regular Class Registration
        const existingClassMember = await ctx.db.classMember.findFirst({
          where: { classId: input.classId, memberId: input.memberId },
        });
        if (existingClassMember) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Member sudah terdaftar di kelas ini (via registrasi kelas)" });
        }

        // ── Determine coverage via cascade priority ────────────────────
        // 1) GYM_MEMBERSHIP active  → free (no deduction)
        // 2) CLASS_SESSION w/ sessions → free (deduct 1 session FIFO)
        // 3) neither                → drop-in, must pay
        const activeMembership = await ctx.db.subscription.findFirst({
          where: {
            memberId: input.memberId,
            isActive: true,
            deletedAt: null,
            package: { type: "GYM_MEMBERSHIP" },
          },
        });

        const classSessionSub = activeMembership
          ? null
          : await ctx.db.subscription.findFirst({
              where: {
                memberId: input.memberId,
                isActive: true,
                deletedAt: null,
                package: { type: "CLASS_SESSION" },
                OR: [
                  { remainingSessions: { gt: 0 } },
                  { remainingBonusSessions: { gt: 0 } },
                ],
              },
            });

        const coverage: "MEMBERSHIP" | "CLASS_SESSION" | "PAID" = activeMembership
          ? "MEMBERSHIP"
          : classSessionSub
            ? "CLASS_SESSION"
            : "PAID";
        const isFree = coverage !== "PAID";

        result = await ctx.db.$transaction(async (tx) => {
          // Deduct a class session if covered by CLASS_SESSION package
          let sessionSubId: string | null = null;
          let isBonusSession = false;
          if (coverage === "CLASS_SESSION") {
            const fifo = await decrementClassSessionFIFO({ tx, memberId: input.memberId });
            sessionSubId = fifo.id;
            isBonusSession = fifo.isBonusSession;
          }

          const data = {
            status: isFree ? ("CONFIRMED" as const) : ("PENDING_PAYMENT" as const),
            isFree,
            paidAmount: isFree ? 0 : cls.price,
            paymentStatus: isFree ? ("FREE" as const) : ("PENDING" as const),
            paymentMethod: input.paymentMethod ?? null,
            notes: input.notes ?? null,
            confirmedBy: isFree ? ctx.session.user.id : null,
            confirmedAt: isFree ? new Date() : null,
            subscriptionId: sessionSubId,
            isBonusSession,
          };

          if (existing && existing.status === "CANCELLED") {
            return tx.classVisitRegistration.update({
              where: { id: existing.id },
              data: { ...data, cancelReason: null, paidAt: null } as any,
            });
          }
          return tx.classVisitRegistration.create({
            data: {
              classId: input.classId,
              memberId: input.memberId,
              ...data,
            } as any,
          });
        });

        success = true;
        return { ...result, isFree, coverage };
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "classVisit.register",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /**
   * Admin confirms payment → status PENDING_PAYMENT → CONFIRMED
   */
  confirmPayment: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        registrationId: z.string(),
        paymentMethod: z.string().min(1),
        paymentProof: z.string().optional(),
        notes: z.string().optional(),
        balanceAccountId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const reg = await ctx.db.classVisitRegistration.findUnique({
          where: { id: input.registrationId },
          include: {
            class: { include: { classType: true } },
            member: { include: { user: true } },
          },
        });

        if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registrasi tidak ditemukan" });
        if (reg.status !== "PENDING_PAYMENT") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Registrasi ini tidak dalam status menunggu pembayaran" });
        }

        result = await ctx.db.$transaction(async (tx) => {
          const updated = await tx.classVisitRegistration.update({
            where: { id: input.registrationId },
            data: {
              status: "CONFIRMED",
              paymentStatus: "PAID",
              paymentMethod: input.paymentMethod,
              paymentProof: input.paymentProof ?? null,
              paidAt: new Date(),
              confirmedBy: ctx.session.user.id,
              confirmedAt: new Date(),
              notes: input.notes ?? reg.notes,
              balanceAccountId: input.balanceAccountId ?? null,
            } as any,
          });

          // Create Transaction record for tracking in cash bank report
          if (reg.paidAmount > 0 && input.balanceAccountId) {
            const coaConfig = await ctx.db.config.findUnique({ where: { key: "default_coa_id" } });
            const coaId = coaConfig
              ? parseInt(coaConfig.value)
              : (await tx.chartAccount.findFirst({ orderBy: { id: "asc" } }))?.id;

            if (coaId) {
              const today = new Date();
              const yearPart = today.getFullYear().toString().slice(-2);
              const monthPart = String(today.getMonth() + 1).padStart(2, "0");
              const latestTx = await tx.transaction.findFirst({
                where: { transaction_number: { startsWith: `TR${yearPart}-${monthPart}` } },
                orderBy: { transaction_number: "desc" },
              });
              let increment = 1;
              if (latestTx) {
                const parts = latestTx.transaction_number.split("-");
                if (parts.length === 3) increment = parseInt(parts[2] ?? "0") + 1;
              }
              const transaction_number = `TR${yearPart}-${monthPart}-${increment.toString().padStart(3, "0")}`;
              const memberName = reg.member?.user?.name ?? "Unknown";
              const className = reg.class?.name ?? (reg.class?.classType?.name ?? "Class Visit");
              await tx.transaction.create({
                data: {
                  bank_id: input.balanceAccountId,
                  account_id: coaId,
                  type: "income",
                  file: input.paymentProof ?? "",
                  description: `Class Visit: ${memberName} – ${className}`,
                  transaction_date: today,
                  transaction_number,
                  amount: reg.paidAmount,
                },
              });
            }
          }

          return updated;
        });

        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "classVisit.confirmPayment",
          method: "PUT",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /**
   * Mark registration as ATTENDED or NO_SHOW
   * - If ATTENDED: creates AttendanceMember (gym check-in) with facility info, awards points (1x/day)
   * - If NO_SHOW: only updates status
   */
  markAttendance: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        registrationId: z.string(),
        attended: z.boolean(),
        lokerNumber: z.string().optional(),
        handuk: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const reg = await ctx.db.classVisitRegistration.findUnique({
          where: { id: input.registrationId },
          include: {
            class: { select: { schedule: true, name: true } },
            member: { select: { id: true, userId: true, user: { select: { id: true, point: true } } } },
          },
        });

        if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registrasi tidak ditemukan" });
        if (reg.status !== "CONFIRMED" && reg.status !== "ATTENDED" && reg.status !== "NO_SHOW") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya registrasi yang sudah dikonfirmasi yang dapat diabsen" });
        }

        // Update registration status
        const updatedReg = await ctx.db.classVisitRegistration.update({
          where: { id: input.registrationId },
          data: { status: input.attended ? "ATTENDED" : "NO_SHOW" },
        });

        let pointsAwarded = false;

        // If attended: create AttendanceMember (gym check-in) + award points
        if (input.attended) {
          // Build facility description
          const parts: string[] = [];
          if (input.lokerNumber?.trim()) parts.push(`Loker = ${input.lokerNumber.trim()}`);
          if (input.handuk && input.handuk !== "None") parts.push(`Handuk = ${input.handuk}`);
          const facilityDescription = parts.length > 0 ? parts.join(", ") : undefined;

          const checkinTime = reg.class.schedule;

          // Check if AttendanceMember already exists for this member + this class schedule
          const existing = await ctx.db.attendanceMember.findFirst({
            where: {
              memberId: reg.memberId,
              checkin: checkinTime,
            },
          });

          if (existing) {
            // Update facility info only
            await ctx.db.attendanceMember.update({
              where: { id: existing.id },
              data: { facilityDescription },
            });
          } else {
            // Create new AttendanceMember
            const newAttendance = await ctx.db.attendanceMember.create({
              data: {
                memberId: reg.memberId,
                checkin: checkinTime,
                facilityDescription,
              },
            });

            // Award points if first check-in today
            const todayStart = new Date(checkinTime);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setDate(todayStart.getDate() + 1);

            const alreadyCheckedInToday = await ctx.db.attendanceMember.findFirst({
              where: {
                memberId: reg.memberId,
                checkin: { gte: todayStart, lt: todayEnd },
                id: { not: newAttendance.id },
              },
            });

            if (!alreadyCheckedInToday) {
              const config = await ctx.db.config.findUnique({
                where: { key: "rfid_point" },
              });
              const pointValue = config ? parseInt(config.value) || 1 : 1;

              if (pointValue > 0) {
                await ctx.db.user.update({
                  where: { id: reg.member.userId },
                  data: { point: { increment: pointValue } },
                });
                await logPointHistory(ctx.db, {
                  userId: reg.member.userId,
                  amount: pointValue,
                  type: "EARN",
                  source: "CHECKIN",
                  description: `Poin kehadiran class visit (${reg.class.name})`,
                  referenceId: newAttendance.id,
                });
                pointsAwarded = true;
              }
            }
          }
        }

        result = { ...updatedReg, pointsAwarded };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "classVisit.markAttendance",
          method: "PUT",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /**
   * Cancel a registration
   */
  cancel: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        registrationId: z.string(),
        cancelReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const reg = await ctx.db.classVisitRegistration.findUnique({
          where: { id: input.registrationId },
        });

        if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registrasi tidak ditemukan" });
        if (reg.status === "ATTENDED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Registrasi yang sudah hadir tidak dapat dibatalkan" });
        }

        const regAny = reg as any;

        result = await ctx.db.$transaction(async (tx) => {
          // Refund the class session if one was deducted at registration
          if (regAny.subscriptionId) {
            await tx.subscription.update({
              where: { id: regAny.subscriptionId },
              data: regAny.isBonusSession
                ? { remainingBonusSessions: { increment: 1 } }
                : { remainingSessions: { increment: 1 } },
            });
          }

          return tx.classVisitRegistration.update({
            where: { id: input.registrationId },
            data: {
              status: "CANCELLED",
              cancelReason: input.cancelReason ?? null,
              subscriptionId: null,
              isBonusSession: false,
            } as any,
          });
        });

        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "classVisit.cancel",
          method: "PUT",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /**
   * List all visit registrations for a specific class
   */
  listByClass: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        classId: z.string(),
        status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED", "all"]).optional().default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { classId: input.classId };
      if (input.status !== "all") where.status = input.status;

      const registrations = await ctx.db.classVisitRegistration.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: {
          member: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
            },
          },
        },
      });

      // Resolve confirmer names
      const confirmerIds = registrations.map((r) => r.confirmedBy).filter(Boolean) as string[];
      const confirmers = confirmerIds.length
        ? await ctx.db.user.findMany({
            where: { id: { in: confirmerIds } },
            select: { id: true, name: true },
          })
        : [];
      const confirmerMap = new Map(confirmers.map((u) => [u.id, u.name]));

      return registrations.map((r) => ({
        ...r,
        confirmerName: r.confirmedBy ? (confirmerMap.get(r.confirmedBy) ?? null) : null,
      }));
    }),

  /**
   * List all classes with visit registration summary (for admin overview)
   */
  listClasses: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        filter: z.enum(["all", "past", "upcoming"]).optional().default("upcoming"),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(20),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.dateFrom || input.dateTo) {
        where.schedule = {};
        if (input.dateFrom) where.schedule.gte = input.dateFrom;
        if (input.dateTo) where.schedule.lte = input.dateTo;
      } else if (input.filter === "upcoming") {
        where.schedule = { gte: new Date() };
      } else if (input.filter === "past") {
        where.schedule = { lt: new Date() };
      }

      const [classes, total] = await Promise.all([
        ctx.db.class.findMany({
          where,
          orderBy: { schedule: input.filter === "past" ? "desc" : "asc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            classType: true,
            classVisitRegistrations: {
              where: { status: { not: "CANCELLED" } },
              select: { id: true, status: true, isFree: true, paymentStatus: true },
            },
          },
        }),
        ctx.db.class.count({ where }),
      ]);

      return {
        items: classes.map((cls) => ({
          id: cls.id,
          name: cls.name,
          schedule: cls.schedule,
          duration: cls.duration,
          instructorName: cls.instructorName,
          price: cls.price,
          limit: cls.limit,
          classType: cls.classType,
          visitStats: {
            total: cls.classVisitRegistrations.length,
            pending: cls.classVisitRegistrations.filter((r) => r.status === "PENDING_PAYMENT").length,
            confirmed: cls.classVisitRegistrations.filter((r) => r.status === "CONFIRMED").length,
            attended: cls.classVisitRegistrations.filter((r) => r.status === "ATTENDED").length,
            free: cls.classVisitRegistrations.filter((r) => r.isFree).length,
            paid: cls.classVisitRegistrations.filter((r) => r.paymentStatus === "PAID").length,
          },
        })),
        total,
      };
    }),

  /**
   * Upload bukti pembayaran (base64) → simpan ke /public/assets/class-visit/
   */
  uploadPaymentProof: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        registrationId: z.string(),
        fileData: z.string(),   // base64
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(input.fileType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tipe file tidak valid. Gunakan JPG, PNG, atau PDF." });
      }

      const base64Data = input.fileData.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ukuran file maksimal 5MB." });
      }

      const extension = path.extname(input.fileName);
      const uniqueFilename = `${uuidv4()}${extension}`;
      const relativeDir = path.join("assets", "class-visit");
      const uploadDir = path.join(process.cwd(), "public", relativeDir);
      const filePath = path.join("/", relativeDir, uniqueFilename).replace(/\\/g, "/");

      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, uniqueFilename), buffer);

      // Update paymentProof on the registration
      const updated = await ctx.db.classVisitRegistration.update({
        where: { id: input.registrationId },
        data: { paymentProof: filePath },
      });

      return { filePath, registration: updated };
    }),

  /**
   * Revenue summary for class visits (enhanced with per-class breakdown)
   */
  revenueSummary: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { paymentStatus: "PAID" };
      if (input.startDate || input.endDate) {
        where.paidAt = {};
        if (input.startDate) where.paidAt.gte = input.startDate;
        if (input.endDate) where.paidAt.lte = input.endDate;
      }

      const regs = await ctx.db.classVisitRegistration.findMany({
        where,
        select: {
          paidAmount: true,
          paidAt: true,
          classId: true,
          paymentMethod: true,
          class: { select: { name: true, schedule: true } },
        },
      });

      const freeCount = await ctx.db.classVisitRegistration.count({
        where: {
          isFree: true,
          status: { in: ["CONFIRMED", "ATTENDED"] },
          ...(input.startDate || input.endDate
            ? { createdAt: { gte: input.startDate, lte: input.endDate } }
            : {}),
        },
      });

      const totalRevenue = regs.reduce((sum, r) => sum + r.paidAmount, 0);

      // Per-class breakdown
      const byClass = new Map<string, { className: string; schedule: Date | null; revenue: number; count: number }>();
      for (const r of regs) {
        const existing = byClass.get(r.classId);
        if (existing) {
          existing.revenue += r.paidAmount;
          existing.count += 1;
        } else {
          byClass.set(r.classId, {
            className: r.class.name,
            schedule: r.class.schedule,
            revenue: r.paidAmount,
            count: 1,
          });
        }
      }

      return {
        totalRevenue,
        totalPaidVisits: regs.length,
        totalFreeVisits: freeCount,
        byClass: Array.from(byClass.entries()).map(([classId, v]) => ({ classId, ...v })),
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // MEMBER-FACING PROCEDURES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List upcoming classes available for class visit (member-facing)
   */
  listAvailableClasses: permissionProtectedProcedure(["request:class-visit"])
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find current user's membership id for duplicate check
      const membership = await ctx.db.membership.findFirst({
        where: { userId },
      });

      const where: any = { schedule: { gte: new Date() } };

      const [classes, total] = await Promise.all([
        ctx.db.class.findMany({
          where,
          orderBy: { schedule: "asc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            classType: true,
            classVisitRegistrations: {
              where: { status: { not: "CANCELLED" } },
              select: { id: true, status: true, memberId: true },
            },
          },
        }),
        ctx.db.class.count({ where }),
      ]);

      // Check if member has active GYM_MEMBERSHIP subscription
      const activeSub = membership
        ? await ctx.db.subscription.findFirst({
            where: {
              memberId: membership.id,
              isActive: true,
              deletedAt: null,
              package: { type: "GYM_MEMBERSHIP" },
            },
          })
        : null;

      // Aggregate remaining CLASS_SESSION sessions (paid + bonus) if no membership
      let remainingClassSessions = 0;
      if (membership && !activeSub) {
        const classSubs = await ctx.db.subscription.findMany({
          where: {
            memberId: membership.id,
            isActive: true,
            deletedAt: null,
            package: { type: "CLASS_SESSION" },
          },
          select: { remainingSessions: true, remainingBonusSessions: true },
        });
        remainingClassSessions = classSubs.reduce(
          (sum, s) => sum + (s.remainingSessions ?? 0) + (s.remainingBonusSessions ?? 0),
          0,
        );
      }

      // Coverage: membership = free; else class-session available = covered; else pay
      const coverage: "MEMBERSHIP" | "CLASS_SESSION" | "PAID" = activeSub
        ? "MEMBERSHIP"
        : remainingClassSessions > 0
          ? "CLASS_SESSION"
          : "PAID";
      const isFreeForMe = coverage !== "PAID";

      return {
        items: classes.map((cls) => {
          const confirmedCount = cls.classVisitRegistrations.filter(
            (r) => r.status === "CONFIRMED" || r.status === "ATTENDED",
          ).length;
          const myRegistration = membership
            ? cls.classVisitRegistrations.find((r) => r.memberId === membership.id)
            : undefined;
          const isFull = cls.limit !== null && confirmedCount >= cls.limit;
          return {
            id: cls.id,
            name: cls.name,
            schedule: cls.schedule,
            duration: cls.duration,
            instructorName: cls.instructorName,
            price: cls.price,
            limit: cls.limit,
            classType: cls.classType,
            confirmedCount,
            isFull,
            isFreeForMe,
            coverage,
            myRegistration: myRegistration
              ? { id: myRegistration.id, status: myRegistration.status }
              : null,
          };
        }),
        total,
        isMember: !!membership,
        isFreeForMe,
        coverage,
        remainingClassSessions,
      };
    }),

  /**
   * Member requests a class visit for themselves
   */
  requestByMember: permissionProtectedProcedure(["request:class-visit"])
    .input(
      z.object({
        classId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const userId = ctx.session.user.id;

        // Find member's membership
        const membership = await ctx.db.membership.findFirst({
          where: { userId },
        });
        if (!membership) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Akun kamu belum terdaftar sebagai member gym." });
        }

        // Validate class
        const cls = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: {
            classVisitRegistrations: {
              where: { status: { not: "CANCELLED" } },
            },
          },
        });
        if (!cls) throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" });
        if (cls.schedule < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kelas ini sudah berlalu" });
        }

        // Capacity check (combine ClassMember + ClassVisitRegistration confirmed)
        if (cls.limit !== null) {
          const confirmedVisitCount = cls.classVisitRegistrations.filter(
            (r) => r.status === "CONFIRMED" || r.status === "ATTENDED",
          ).length;
          const memberCount = await ctx.db.classMember.count({
            where: { classId: input.classId },
          });
          if (confirmedVisitCount + memberCount >= cls.limit) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Kapasitas kelas sudah penuh" });
          }
        }

        // Duplicate check (class visit)
        const existing = await ctx.db.classVisitRegistration.findUnique({
          where: { classId_memberId: { classId: input.classId, memberId: membership.id } },
        });
        if (existing && existing.status !== "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kamu sudah terdaftar di kelas ini" });
        }

        // Cross-check: already registered via regular Class Registration
        const existingClassMember = await ctx.db.classMember.findFirst({
          where: { classId: input.classId, memberId: membership.id },
        });
        if (existingClassMember) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kamu sudah terdaftar di kelas ini" });
        }

        // ── Coverage cascade: GYM_MEMBERSHIP → CLASS_SESSION → paid drop-in ──
        const activeSub = await ctx.db.subscription.findFirst({
          where: {
            memberId: membership.id,
            isActive: true,
            deletedAt: null,
            package: { type: "GYM_MEMBERSHIP" },
          },
        });

        const classSessionSub = activeSub
          ? null
          : await ctx.db.subscription.findFirst({
              where: {
                memberId: membership.id,
                isActive: true,
                deletedAt: null,
                package: { type: "CLASS_SESSION" },
                OR: [
                  { remainingSessions: { gt: 0 } },
                  { remainingBonusSessions: { gt: 0 } },
                ],
              },
            });

        const coverage: "MEMBERSHIP" | "CLASS_SESSION" | "PAID" = activeSub
          ? "MEMBERSHIP"
          : classSessionSub
            ? "CLASS_SESSION"
            : "PAID";
        const isFree = coverage !== "PAID";

        result = await ctx.db.$transaction(async (tx) => {
          let sessionSubId: string | null = null;
          let isBonusSession = false;
          if (coverage === "CLASS_SESSION") {
            const fifo = await decrementClassSessionFIFO({ tx, memberId: membership.id });
            sessionSubId = fifo.id;
            isBonusSession = fifo.isBonusSession;
          }

          const data: any = {
            classId: input.classId,
            memberId: membership.id,
            status: isFree ? "CONFIRMED" : "PENDING_PAYMENT",
            isFree,
            paidAmount: isFree ? 0 : (cls.price ?? 0),
            paymentStatus: isFree ? "FREE" : "PENDING",
            notes: input.notes ?? null,
            confirmedBy: isFree ? ctx.session.user.id : null,
            confirmedAt: isFree ? new Date() : null,
            requestedByMember: true,
            subscriptionId: sessionSubId,
            isBonusSession,
          };

          if (existing && existing.status === "CANCELLED") {
            return tx.classVisitRegistration.update({ where: { id: existing.id }, data });
          }
          return tx.classVisitRegistration.create({ data });
        });

        success = true;
        const message =
          coverage === "MEMBERSHIP"
            ? "Berhasil terdaftar (Gratis – kamu punya membership aktif)"
            : coverage === "CLASS_SESSION"
              ? "Berhasil terdaftar (1 sesi kelas kamu dipotong)"
              : "Request berhasil dikirim. Silakan transfer dan upload bukti bayar, lalu tunggu konfirmasi admin.";
        return { ...result, isFree, coverage, message };
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "classVisit.requestByMember",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  /**
   * Member views their own class visit requests
   */
  myRequests: permissionProtectedProcedure(["request:class-visit"])
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.membership.findFirst({ where: { userId } });
      if (!membership) return { items: [], total: 0 };

      const where = { memberId: membership.id };
      const [items, total] = await Promise.all([
        ctx.db.classVisitRegistration.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            class: {
              select: { name: true, schedule: true, duration: true, instructorName: true, price: true, classType: true },
            },
          },
        }),
        ctx.db.classVisitRegistration.count({ where }),
      ]);

      return { items, total };
    }),

  /**
   * Member cancels their own PENDING_PAYMENT request
   */
  cancelByMember: permissionProtectedProcedure(["request:class-visit"])
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.membership.findFirst({ where: { userId } });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Bukan member" });

      const reg = await ctx.db.classVisitRegistration.findUnique({ where: { id: input.registrationId } });
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registrasi tidak ditemukan" });
      if (reg.memberId !== membership.id) throw new TRPCError({ code: "FORBIDDEN", message: "Bukan registrasi kamu" });
      if (reg.status !== "PENDING_PAYMENT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya request yang belum dikonfirmasi yang bisa dibatalkan" });
      }

      return ctx.db.classVisitRegistration.update({
        where: { id: input.registrationId },
        data: { status: "CANCELLED", cancelReason: "Dibatalkan oleh member" },
      });
    }),

  /**
   * Member uploads payment proof for their own registration
   */
  uploadProofByMember: permissionProtectedProcedure(["request:class-visit"])
    .input(
      z.object({
        registrationId: z.string(),
        fileData: z.string(),
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.membership.findFirst({ where: { userId } });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Bukan member" });

      const reg = await ctx.db.classVisitRegistration.findUnique({ where: { id: input.registrationId } });
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registrasi tidak ditemukan" });
      if (reg.memberId !== membership.id) throw new TRPCError({ code: "FORBIDDEN", message: "Bukan registrasi kamu" });
      if (reg.status !== "PENDING_PAYMENT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya request yang belum dikonfirmasi yang bisa upload bukti" });
      }

      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(input.fileType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tipe file tidak valid. Gunakan JPG, PNG, atau PDF." });
      }

      const base64Data = input.fileData.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ukuran file maksimal 5MB." });
      }

      const extension = path.extname(input.fileName);
      const uniqueFilename = `${uuidv4()}${extension}`;
      const relativeDir = path.join("assets", "class-visit");
      const uploadDir = path.join(process.cwd(), "public", relativeDir);
      const filePath = path.join("/", relativeDir, uniqueFilename).replace(/\\/g, "/");

      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, uniqueFilename), buffer);

      return ctx.db.classVisitRegistration.update({
        where: { id: input.registrationId },
        data: { paymentProof: filePath },
      });
    }),

  /**
   * Member views the full history of classes they have ever joined,
   * combining regular class registrations (ClassMember) and class visits
   * (ClassVisitRegistration). Includes both past and upcoming.
   */
  myClassHistory: permissionProtectedProcedure(["request:class-visit"])
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.membership.findFirst({ where: { userId } });
      if (!membership) return { items: [], total: 0 };

      const [classMembers, visits] = await Promise.all([
        ctx.db.classMember.findMany({
          where: { memberId: membership.id },
          include: {
            class: {
              select: { name: true, schedule: true, duration: true, instructorName: true, classType: true },
            },
          },
        }),
        ctx.db.classVisitRegistration.findMany({
          where: { memberId: membership.id, status: { not: "CANCELLED" } },
          include: {
            class: {
              select: { name: true, schedule: true, duration: true, instructorName: true, classType: true },
            },
          },
        }),
      ]);

      // Unify both sources into one shape
      const unified = [
        ...classMembers.map((cm) => ({
          id: cm.id,
          source: "REGISTRATION" as const,
          className: cm.class.name,
          instructorName: cm.class.instructorName,
          schedule: cm.class.schedule,
          duration: cm.class.duration,
          classType: cm.class.classType,
          status: cm.attended ? "ATTENDED" : "REGISTERED",
          isFree: !cm.subscriptionId,
          usedSession: !!cm.subscriptionId,
          paidAmount: 0,
        })),
        ...visits.map((v) => ({
          id: v.id,
          source: "VISIT" as const,
          className: v.class.name,
          instructorName: v.class.instructorName,
          schedule: v.class.schedule,
          duration: v.class.duration,
          classType: v.class.classType,
          status: v.status,
          isFree: v.isFree,
          usedSession: !!(v as any).subscriptionId,
          paidAmount: v.paidAmount,
        })),
      ];

      // Sort by class schedule descending (most recent first)
      unified.sort((a, b) => new Date(b.schedule).getTime() - new Date(a.schedule).getTime());

      const total = unified.length;
      const start = (input.page - 1) * input.pageSize;
      const items = unified.slice(start, start + input.pageSize);

      return { items, total };
    }),

  // Count pending class visit registrations (for sidebar badge)
  pendingCount: permissionProtectedProcedure(["manage:class-visit"])
    .query(async ({ ctx }) => {
      const count = await ctx.db.classVisitRegistration.count({
        where: { status: "PENDING_PAYMENT" },
      });
      return count;
    }),
});
