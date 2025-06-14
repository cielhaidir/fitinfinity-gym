import { z } from "zod";
import { createTRPCRouter, publicProcedure, deviceProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { EnrollmentStatus } from "@prisma/client";

const deviceAuthInput = z.object({
    deviceId: z.string(),
    accessKey: z.string()
});

export const esp32Router = createTRPCRouter({
    authenticate: publicProcedure
        .input(z.object({
            deviceId: z.string(),
            accessKey: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                return {
                    authenticated: true,
                    message: "Device authenticated successfully"
                };
            } catch (error) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid device credentials",
                });
            }
        }),

    // New enrollment endpoint
    requestEnrollment: protectedProcedure
        .input(z.object({
            employeeId: z.string(),
            // deviceId: z.string(),
            // accessKey: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const employee = await ctx.db.employee.findUnique({
                    where: { id: input.employeeId }
                });

                if (!employee) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Employee not found"
                    });
                }

                // Update employee status to pending enrollment
                await ctx.db.employee.update({
                    where: { id: input.employeeId },
                    data: {
                        enrollmentStatus: EnrollmentStatus.PENDING,
                        // deviceId: input.deviceId
                    }
                });

                return {
                    success: true,
                    message: "Enrollment request initiated"
                };
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to initiate enrollment"
                });
            }
        }),

    // Get pending enrollments
    getPendingEnrollments: deviceProcedure
        .input(deviceAuthInput)
        .query(async ({ ctx, input }) => {
            try {
                const pendingEmployee = await ctx.db.employee.findFirst({
                    where: {
                        enrollmentStatus: "PENDING",
                        deviceId: input.deviceId
                    },
                    include: {
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                });

                if (!pendingEmployee) {
                    return { status: "none" };
                }

                return {
                    id: pendingEmployee.id,
                    nama: pendingEmployee.user.name
                };
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get pending enrollments"
                });
            }
        }),

    // Update enrollment status
    updateEnrollmentStatus: deviceProcedure
        .input(z.object({
            employeeId: z.string(),
            fingerprintId: z.number(),
            status: z.enum(["ENROLLED", "FAILED"]),
            deviceId: z.string(),
            accessKey: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.employee.update({
                    where: { id: input.employeeId },
                    data: {
                        fingerprintId: input.status === EnrollmentStatus.ENROLLED ? input.fingerprintId : null,
                        enrollmentStatus: input.status,
                        deviceId: null // Clear device ID after enrollment
                    }
                });

                return {
                    success: true,
                    message: `Enrollment ${input.status.toLowerCase()}`
                };
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update enrollment status"
                });
            }
        }),

    logFingerprint: deviceProcedure
        .input(z.object({
            fingerId: z.number(),
            timestamp: z.string().optional(),
            deviceId: z.string(),
            accessKey: z.string()  // Required for device auth
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const { fingerId, timestamp, deviceId } = input;
                const logTime = timestamp ? new Date(timestamp) : new Date();

                const employee = await ctx.db.employee.findFirst({
                    where: { fingerprintId: input.fingerId }
                });

                if (!employee) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Employee not found",
                    });
                }

                const today = new Date(logTime);
                today.setHours(0, 0, 0, 0);

                const existingAttendance = await ctx.db.attendance.findFirst({
                    where: {
                        employeeId: employee.id,
                        date: {
                            gte: today,
                            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                        },
                    },
                });

                if (!existingAttendance) {
                    // Check in
                    return await ctx.db.attendance.create({
                        data: {
                            employeeId: employee.id,
                            checkIn: logTime,
                            date: today,
                            deviceId: deviceId
                        },
                    });
                } else if (!existingAttendance.checkOut) {
                    // Check out
                    return await ctx.db.attendance.update({
                        where: { id: existingAttendance.id },
                        data: {
                            checkOut: logTime,
                            deviceId: deviceId
                        },
                    });
                }

                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Already checked in and out today",
                });
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to log attendance",
                });
            }
        }),

    // RFID attendance endpoint
    logRFID: deviceProcedure
        .input(z.object({
            rfid: z.string(),
            timestamp: z.string().optional(),
            deviceId: z.string(),
            accessKey: z.string()  // Required for device auth
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const { rfid, timestamp, deviceId } = input;
                const logTime = timestamp ? new Date(timestamp) : new Date();

                // Find member by RFID
                const membership = await ctx.db.membership.findFirst({
                    where: {
                        rfidNumber: rfid,
                        isActive: true
                    }
                });

                if (!membership) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Active member not found",
                    });
                }

                // Log member attendance
                const memberAttendance = await ctx.db.attendanceMember.create({
                    data: {
                        memberId: membership.id,
                        checkin: logTime
                    }
                });

                return {
                    success: true,
                    message: "Member attendance logged successfully",
                    data: memberAttendance
                };

            } catch (error) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to log member attendance",
                });
            }
        }),

    // Bulk attendance submission endpoint
    bulkLog: deviceProcedure
        .input(z.object({
            logs: z.array(z.object({
                type: z.enum(['fingerprint', 'rfid']),
                id: z.union([z.number(), z.string()]),
                timestamp: z.string(),
                deviceId: z.string(),
                accessKey: z.string()  // Required for device auth
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const results = await Promise.all(
                    input.logs.map(async (log) => {
                        if (log.type === 'fingerprint') {
                            return await ctx.db.$transaction(async (tx) => {
                                const employee = await tx.employee.findFirst({
                                    where: { fingerprintId: log.id as number }
                                });
                                if (!employee) return { success: false, message: `Employee not found for fingerprint ${log.id}` };

                                const logTime = new Date(log.timestamp);
                                const today = new Date(logTime);
                                today.setHours(0, 0, 0, 0);

                                const existingAttendance = await tx.attendance.findFirst({
                                    where: {
                                        employeeId: employee.id,
                                        date: {
                                            gte: today,
                                            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                                        },
                                    },
                                });

                                if (!existingAttendance) {
                                    await tx.attendance.create({
                                        data: {
                                            employeeId: employee.id,
                                            checkIn: logTime,
                                            date: today,
                                            deviceId: log.deviceId
                                        },
                                    });
                                    return { success: true, message: `Check-in recorded for fingerprint ${log.id}` };
                                } else if (!existingAttendance.checkOut) {
                                    await tx.attendance.update({
                                        where: { id: existingAttendance.id },
                                        data: {
                                            checkOut: logTime,
                                            deviceId: log.deviceId
                                        },
                                    });
                                    return { success: true, message: `Check-out recorded for fingerprint ${log.id}` };
                                }
                                return { success: false, message: `Already checked in and out for fingerprint ${log.id}` };
                            });
                        } else {
                            return await ctx.db.$transaction(async (tx) => {
                                const employee = await tx.employee.findFirst({
                                    where: { rfidTag: log.id as string }
                                });
                                if (!employee) return { success: false, message: `Employee not found for RFID ${log.id}` };

                                const logTime = new Date(log.timestamp);
                                const today = new Date(logTime);
                                today.setHours(0, 0, 0, 0);

                                const existingAttendance = await tx.attendance.findFirst({
                                    where: {
                                        employeeId: employee.id,
                                        date: {
                                            gte: today,
                                            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                                        },
                                    },
                                });

                                if (!existingAttendance) {
                                    await tx.attendance.create({
                                        data: {
                                            employeeId: employee.id,
                                            checkIn: logTime,
                                            date: today,
                                            deviceId: log.deviceId
                                        },
                                    });
                                    return { success: true, message: `Check-in recorded for RFID ${log.id}` };
                                } else if (!existingAttendance.checkOut) {
                                    await tx.attendance.update({
                                        where: { id: existingAttendance.id },
                                        data: {
                                            checkOut: logTime,
                                            deviceId: log.deviceId
                                        },
                                    });
                                    return { success: true, message: `Check-out recorded for RFID ${log.id}` };
                                }
                                return { success: false, message: `Already checked in and out for RFID ${log.id}` };
                            });
                        }
                    })
                );

                return {
                    success: true,
                    results
                };
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to process bulk attendance logs",
                });
            }
        }),
});