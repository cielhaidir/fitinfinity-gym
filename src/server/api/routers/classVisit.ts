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

        // Check duplicate
        const existing = await ctx.db.classVisitRegistration.findUnique({
          where: { classId_memberId: { classId: input.classId, memberId: input.memberId } },
        });
        if (existing && existing.status !== "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Member sudah terdaftar di kelas ini" });
        }

        // Check active GYM_MEMBERSHIP subscription
        const activeMembership = await ctx.db.subscription.findFirst({
          where: {
            memberId: input.memberId,
            isActive: true,
            deletedAt: null,
            package: { type: "GYM_MEMBERSHIP" },
          },
        });

        const isFree = !!activeMembership;

        // Upsert (in case cancelled before)
        if (existing && existing.status === "CANCELLED") {
          result = await ctx.db.classVisitRegistration.update({
            where: { id: existing.id },
            data: {
              status: isFree ? "CONFIRMED" : "PENDING_PAYMENT",
              isFree,
              paidAmount: isFree ? 0 : cls.price,
              paymentStatus: isFree ? "FREE" : "PENDING",
              paymentMethod: input.paymentMethod ?? null,
              notes: input.notes ?? null,
              confirmedBy: isFree ? ctx.session.user.id : null,
              confirmedAt: isFree ? new Date() : null,
              cancelReason: null,
              paidAt: null,
            },
          });
        } else {
          result = await ctx.db.classVisitRegistration.create({
            data: {
              classId: input.classId,
              memberId: input.memberId,
              status: isFree ? "CONFIRMED" : "PENDING_PAYMENT",
              isFree,
              paidAmount: isFree ? 0 : cls.price,
              paymentStatus: isFree ? "FREE" : "PENDING",
              paymentMethod: input.paymentMethod ?? null,
              notes: input.notes ?? null,
              confirmedBy: isFree ? ctx.session.user.id : null,
              confirmedAt: isFree ? new Date() : null,
            },
          });
        }

        success = true;
        return { ...result, isFree };
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
        if (reg.status !== "PENDING_PAYMENT") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Registrasi ini tidak dalam status menunggu pembayaran" });
        }

        result = await ctx.db.classVisitRegistration.update({
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
          },
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
   */
  markAttendance: permissionProtectedProcedure(["manage:class-visit"])
    .input(
      z.object({
        registrationId: z.string(),
        attended: z.boolean(),
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
        if (reg.status !== "CONFIRMED" && reg.status !== "ATTENDED" && reg.status !== "NO_SHOW") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya registrasi yang sudah dikonfirmasi yang dapat diabsen" });
        }

        result = await ctx.db.classVisitRegistration.update({
          where: { id: input.registrationId },
          data: { status: input.attended ? "ATTENDED" : "NO_SHOW" },
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

        result = await ctx.db.classVisitRegistration.update({
          where: { id: input.registrationId },
          data: {
            status: "CANCELLED",
            cancelReason: input.cancelReason ?? null,
          },
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.filter === "upcoming") where.schedule = { gte: new Date() };
      else if (input.filter === "past") where.schedule = { lt: new Date() };

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
            isFreeForMe: !!activeSub,
            myRegistration: myRegistration
              ? { id: myRegistration.id, status: myRegistration.status }
              : null,
          };
        }),
        total,
        isMember: !!membership,
        isFreeForMe: !!activeSub,
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

        // Duplicate check
        const existing = await ctx.db.classVisitRegistration.findUnique({
          where: { classId_memberId: { classId: input.classId, memberId: membership.id } },
        });
        if (existing && existing.status !== "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kamu sudah terdaftar di kelas ini" });
        }

        // Check if free (has active GYM_MEMBERSHIP)
        const activeSub = await ctx.db.subscription.findFirst({
          where: {
            memberId: membership.id,
            isActive: true,
            deletedAt: null,
            package: { type: "GYM_MEMBERSHIP" },
          },
        });
        const isFree = !!activeSub;

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
        };

        if (existing && existing.status === "CANCELLED") {
          result = await ctx.db.classVisitRegistration.update({ where: { id: existing.id }, data });
        } else {
          result = await ctx.db.classVisitRegistration.create({ data });
        }

        success = true;
        return { ...result, isFree, message: isFree ? "Berhasil terdaftar (Gratis – kamu punya membership aktif)" : "Request berhasil dikirim. Silakan transfer dan upload bukti bayar, lalu tunggu konfirmasi admin." };
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
});
