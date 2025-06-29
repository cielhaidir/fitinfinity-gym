import { z } from "zod";
import { createTRPCRouter, publicProcedure, deviceProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { EnrollmentStatus } from "@prisma/client";
import { mqttService } from "@/lib/mqtt/mqttService";

// Output schema for getMemberCheckinLogs
const memberCheckinLogSchema = z.object({
  id: z.string(),
  checkin: z.date(),
  checkout: z.date().nullable(),
  memberId: z.string(),
  memberName: z.string().nullable(),
  userName: z.string().nullable(),
  facilityDescription: z.string().nullable(),
  status: z.string(),
});

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

    // New enrollment endpoint with MQTT integration
    requestEnrollment: protectedProcedure
        .input(z.object({
            employeeId: z.string(),
            deviceId: z.string().optional(), // Make optional for now
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const employee = await ctx.db.employee.findUnique({
                    where: { id: input.employeeId },
                    include: {
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                });

                if (!employee) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Employee not found"
                    });
                }

                // Get an available device or use provided deviceId
                let targetDeviceId = input.deviceId;
                
                if (!targetDeviceId) {
                    // Find an online device to use for enrollment
                    const onlineDevice = await ctx.db.device.findFirst({
                        where: {
                            status: 'ONLINE',
                            mqttConnected: true
                        }
                    });
                    
                    if (!onlineDevice) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "No online devices available for enrollment"
                        });
                    }
                    
                    targetDeviceId = onlineDevice.id;
                }

                // Update employee status to pending enrollment
                await ctx.db.employee.update({
                    where: { id: input.employeeId },
                    data: {
                        enrollmentStatus: EnrollmentStatus.PENDING,
                        deviceId: targetDeviceId
                    }
                });

                // Send MQTT enrollment request to device
                await mqttService.sendEnrollmentRequest(
                    targetDeviceId,
                    input.employeeId,
                    employee.user.name || 'Unknown Employee'
                );

                return {
                    success: true,
                    message: "Enrollment request sent to device",
                    deviceId: targetDeviceId
                };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
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

        logFingerprint : deviceProcedure
        .input(z.object({
          fingerId: z.number(),
          timestamp: z.string().optional(),
          deviceId: z.string(),
          accessKey: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
          try {
            const { fingerId, timestamp, deviceId, accessKey } = input;
      
            // Validasi akses perangkat
            const device = await ctx.db.device.findFirst({
              where: { id: deviceId, accessKey },
            });
      
            if (!device) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid device access",
              });
            }
      
            const logTime = timestamp ? new Date(timestamp) : new Date();
            const startOfDay = new Date(logTime);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
      
            // Temukan karyawan dari fingerprint
            const employee = await ctx.db.employee.findFirst({
              where: { fingerprintId: fingerId },
            });
      
            if (!employee) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Employee not found",
              });
            }
      
            // Cek absensi hari ini
            const existingAttendance = await ctx.db.attendance.findFirst({
              where: {
                employeeId: employee.id,
                date: {
                  gte: startOfDay,
                  lt: endOfDay,
                },
              },
              orderBy: {
                date: "desc",
              },
            });

            console.log("Existing attendance:", existingAttendance);

      
            if (!existingAttendance) {
              // Belum ada data, buat check-in
              return await ctx.db.attendance.create({
                data: {
                  employeeId: employee.id,
                  checkIn: logTime,
                  date: startOfDay,
                  deviceId,
                },
              });
            }
      
            // Sudah ada attendance => update checkOut (overwrite jika perlu)
            return await ctx.db.attendance.update({
              where: { id: existingAttendance.id },
              data: {
                checkOut: logTime,
                deviceId,
              },
            });
      
          } catch (error) {
            console.error("Attendance logging error:", error);
      
            if (error instanceof TRPCError) throw error;
      
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to log attendance",
            });
          }
        }),
    

        logRFID: deviceProcedure
  .input(z.object({
    rfid: z.string(),
    timestamp: z.string().optional(),
    deviceId: z.string(),
    accessKey: z.string()
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
        },
        include: {
          user: true  // <--- penting: ambil relasi user juga
        }
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active member not found",
        });
      }

      // Check if attendance already exists for today
      const todayStart = new Date(logTime);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);

      // Allow multiple check-ins per day
      const memberAttendance = await ctx.db.attendanceMember.create({
        data: {
          memberId: membership.id,
          checkin: logTime
        }
      });

      // Only increment points if this is the first check-in today
      const alreadyCheckedInToday = await ctx.db.attendanceMember.findFirst({
        where: {
          memberId: membership.id,
          checkin: {
            gte: todayStart,
            lt: todayEnd
          },
          id: { not: memberAttendance.id }
        }
      });

      if (!alreadyCheckedInToday) {
        // Fetch config point
        const config = await ctx.db.config.findUnique({
          where: { key: "rfid_point" }
        });

        if (!config) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Config for RFID point not found",
          });
        }

        // Parse value string ke number
        const pointValue = parseInt(config.value) || 0;

        // Update user point
        await ctx.db.user.update({
          where: { id: membership.user.id },
          data: {
            point: { increment: pointValue }
          }
        });
      }

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

  // Manual check-in endpoint for admin use
  manualCheckIn: protectedProcedure
    .input(z.object({
      memberId: z.string(),
      facilityDescription: z.string().optional(),
      timestamp: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { memberId, timestamp } = input;
        // const logTime = timestamp ? new Date(timestamp) : new Date();

        const checkinTime = timestamp ? new Date(timestamp) : new Date();
        // Find member by ID
        const membership = await ctx.db.membership.findFirst({
          where: {
            id: memberId,
            isActive: true
          },
          include: {
            user: true
          }
        });

        if (!membership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active member not found",
          });
        }

        // Check if attendance already exists for today
        const todayStart = new Date(checkinTime);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayStart.getDate() + 1);

        // Allow multiple check-ins per day
        const memberAttendance = await ctx.db.attendanceMember.create({
          data: {
            memberId: membership.id,
            checkin: checkinTime,
            facilityDescription: input.facilityDescription || undefined
          }
        });

        // Only increment points if this is the first check-in today
        const alreadyCheckedInToday = await ctx.db.attendanceMember.findFirst({
          where: {
            memberId: membership.id,
            checkin: {
              gte: todayStart,
              lt: todayEnd
            },
            id: { not: memberAttendance.id }
          }
        });

        if (!alreadyCheckedInToday) {
          // Fetch config point
          const config = await ctx.db.config.findUnique({
            where: { key: "rfid_point" }
          });

          if (!config) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Config for RFID point not found",
            });
          }

          // Parse value string to number
          const pointValue = parseInt(config.value) || 0;

          // Update user point
          await ctx.db.user.update({
            where: { id: membership.user.id },
            data: {
              point: { increment: pointValue }
            }
          });
        }

        return {
          success: true,
          message: "Member checked in manually successfully",
          data: memberAttendance
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to log manual check-in",
        });
      }
    }),

    /**
     * Manual checkout endpoint for admin use
     * Accepts: attendanceId, timestamp (optional)
     * Sets checkout time for the attendance record if not already checked out
     */
    manualCheckout: protectedProcedure
      .input(z.object({
        attendanceId: z.string(),
        timestamp: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const attendance = await ctx.db.attendanceMember.findUnique({
          where: { id: input.attendanceId },
          include: {
            member: {
              include: { user: true },
            },
          },
        });
        if (!attendance) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Attendance record not found",
          });
        }
        if (attendance.checkout) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already checked out",
          });
        }
        const checkoutTime = input.timestamp ? new Date(input.timestamp) : new Date();
        const updated = await ctx.db.attendanceMember.update({
          where: { id: input.attendanceId },
          data: { checkout: checkoutTime },
          include: {
            member: {
              include: { user: true },
            },
          },
        });
        return {
          id: updated.id,
          checkin: updated.checkin,
          checkout: updated.checkout,
          memberId: updated.memberId,
          memberName: updated.member?.user?.name ?? null,
          userName: updated.member?.user?.name ?? null,
          facilityDescription: updated.facilityDescription ?? null,
          status: updated.checkout ? "Checked Out" : "Checked In",
        };
      }),

    /**
     * Admin: Get all member check-in logs
     * Returns: check-in time, checkout time, member ID, member name, user name, facility description (if any), status
     */
    getMemberCheckinLogs: protectedProcedure
    .output(z.array(memberCheckinLogSchema))
    .query(async ({ ctx }) => {
      const logs = await ctx.db.attendanceMember.findMany({
        orderBy: { checkin: "desc" },
        include: {
          member: {
            include: {
              user: true,
            },
          },
        },
      });

      return logs.map((log) => ({
        id: log.id,
        checkin: log.checkin,
        checkout: log.checkout ?? null,
        memberId: log.memberId,
        memberName: log.member?.user?.name ?? null,
        userName: log.member?.user?.name ?? null,
        facilityDescription: log.facilityDescription ?? null,
        status: log.checkout ? "Checked Out" : "Checked In",
      }));
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

        /**
                                       * Admin: Update a member check-in log
                                       * Accepts: log ID, new check-in time (optional), new facility description (optional)
                                       * Returns: updated log entry with member and user info
                                       */
        updateMemberCheckinLog: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            checkin: z.string().optional(),
            facilityDescription: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
     
          const updateData: Record<string, any> = {};
          if (input.checkin) updateData.checkin = new Date(input.checkin);
          if (input.facilityDescription !== undefined)
            updateData.facilityDescription = input.facilityDescription;
    
          if (Object.keys(updateData).length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No fields to update",
            });
          }
    
          const updated = await ctx.db.attendanceMember.update({
            where: { id: input.id },
            data: updateData,
            include: {
              member: {
                include: {
                  user: true,
                },
              },
            },
          });
    
          return {
            id: updated.id,
            checkin: updated.checkin,
            memberId: updated.memberId,
            memberName: updated.member?.user?.name ?? null,
            userName: updated.member?.user?.name ?? null,
            facilityDescription: updated.facilityDescription ?? null,
          };
        }),
});