import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { mqttService } from "../../../lib/mqtt/mqttService";
import { wifiConfigService } from "../../../lib/wifi/wifiConfigService";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

const enrollmentSchema = z.object({
  deviceId: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  fingerprintSlot: z.number().min(1).max(200),
});

const firmwareSchema = z.object({
  deviceIds: z.array(z.string()),
  version: z.string(),
  firmwareFile: z.string(), // Base64 encoded firmware
  releaseNotes: z.string().optional(),
});

const wifiConfigSchema = z.object({
  deviceId: z.string(),
  ssid: z.string(),
  password: z.string(),
});

function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export const mqttRouter = createTRPCRouter({
  // Trigger enrollment via MQTT instead of HTTP polling
  triggerEnrollment: protectedProcedure
    .input(enrollmentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Update database status
        await ctx.db.employee.update({
          where: { id: input.employeeId },
          data: {
            enrollmentStatus: "PENDING",
            deviceId: input.deviceId,
          },
        });

        // Publish enrollment request via MQTT
        const success = await mqttService.triggerEnrollment(input.deviceId, {
          employeeId: input.employeeId,
          employeeName: input.employeeName,
          deviceId: input.deviceId,
          fingerprintSlot: input.fingerprintSlot,
        });

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to publish enrollment request",
          });
        }

        return {
          success: true,
          message: "Enrollment request sent to device",
        };
      } catch (error) {
        console.error("Error triggering enrollment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger enrollment",
        });
      }
    }),

  // Switch device enrollment mode
  switchEnrollmentMode: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      enable: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      try {
        const success = await mqttService.switchEnrollmentMode(input.deviceId, input.enable);
        
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to switch enrollment mode",
          });
        }

        return {
          success: true,
          message: `Enrollment mode ${input.enable ? 'enabled' : 'disabled'} for device`,
        };
      } catch (error) {
        console.error("Error switching enrollment mode:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to switch enrollment mode",
        });
      }
    }),

  // Deploy firmware update
  deployFirmware: protectedProcedure
    .input(firmwareSchema)
    .mutation(async ({ input }) => {
      try {
        // Validate firmware file
        const firmwareBuffer = Buffer.from(input.firmwareFile, 'base64');
        if (firmwareBuffer.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid firmware file",
          });
        }

        const firmwareInfo = {
          version: input.version,
          downloadUrl: `${process.env.NEXTAUTH_URL}/api/ota/download/${input.version}`,
          checksum: calculateChecksum(firmwareBuffer),
          size: firmwareBuffer.length,
          releaseNotes: input.releaseNotes,
        };

        // Store firmware file in the firmware directory
        const fs = require('fs');
        const path = require('path');
        
        const firmwareDir = path.join(process.cwd(), 'firmware');
        if (!fs.existsSync(firmwareDir)) {
          fs.mkdirSync(firmwareDir, { recursive: true });
        }
        
        const firmwareFilePath = path.join(firmwareDir, `${input.version}.bin`);
        fs.writeFileSync(firmwareFilePath, firmwareBuffer);

        // Broadcast to all specified devices
        const deploymentPromises = input.deviceIds.map(deviceId => 
          mqttService.publishFirmwareUpdate(deviceId, firmwareInfo)
        );

        const results = await Promise.allSettled(deploymentPromises);
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.length - successful;

        if (failed > 0) {
          console.warn(`Firmware deployment partially failed: ${successful} succeeded, ${failed} failed`);
        }

        return {
          success: true,
          message: `Firmware ${input.version} deployed to ${successful}/${input.deviceIds.length} devices`,
          details: {
            successful,
            failed,
            total: input.deviceIds.length
          }
        };
      } catch (error) {
        console.error("Error deploying firmware:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deploy firmware",
        });
      }
    }),

  // WiFi Configuration Management
  configureWifi: protectedProcedure
    .input(wifiConfigSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await wifiConfigService.configureWifi(input.deviceId, {
          deviceId: input.deviceId,
          ssid: input.ssid,
          password: input.password,
        });

        return result;
      } catch (error) {
        console.error("Error configuring WiFi:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to configure WiFi",
        });
      }
    }),

  // Request WiFi scan
  requestWifiScan: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await wifiConfigService.requestWifiScan(input.deviceId);
        return result;
      } catch (error) {
        console.error("Error requesting WiFi scan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to request WiFi scan",
        });
      }
    }),

  // Get available WiFi networks for device
  getWifiNetworks: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const deviceInfo = await wifiConfigService.getDeviceWifiInfo(input.deviceId);
        return deviceInfo;
      } catch (error) {
        console.error("Error getting WiFi networks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get WiFi networks",
        });
      }
    }),

  // Get all devices with their status
  getDevicesStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const devices = await ctx.db.device.findMany({
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeen: true,
            firmwareVersion: true,
            configuredWifi: true,
            wifiStatus: true,
            batteryLevel: true,
            signalStrength: true,
            temperature: true,
            errorMessage: true,
            mqttConnected: true,
            lastMqttMessage: true,
          },
          orderBy: {
            lastSeen: 'desc'
          }
        });

        return devices;
      } catch (error) {
        console.error("Error getting devices status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get devices status",
        });
      }
    }),

  // Get device details
  getDeviceDetails: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const device = await ctx.db.device.findUnique({
          where: { id: input.deviceId },
        });

        if (!device) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Device not found",
          });
        }

        return {
          ...device,
          availableNetworks: device.availableNetworks ? JSON.parse(device.availableNetworks) : []
        };
      } catch (error) {
        console.error("Error getting device details:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get device details",
        });
      }
    }),

  // Send command to device
  sendDeviceCommand: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      command: z.string(),
      parameters: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const success = await mqttService.publishToDevice(
          input.deviceId,
          `commands/${input.command}`,
          {
            command: input.command,
            parameters: input.parameters || {},
            timestamp: new Date().toISOString()
          }
        );

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send command to device",
          });
        }

        return {
          success: true,
          message: `Command '${input.command}' sent to device ${input.deviceId}`,
        };
      } catch (error) {
        console.error("Error sending device command:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send device command",
        });
      }
    }),

  // Broadcast message to all devices
  broadcastMessage: protectedProcedure
    .input(z.object({
      message: z.string(),
      type: z.enum(['maintenance', 'announcement', 'system']),
      data: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const success = await mqttService.broadcastToDevices(
          input.type,
          {
            message: input.message,
            data: input.data || {},
            timestamp: new Date().toISOString()
          }
        );

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to broadcast message",
          });
        }

        return {
          success: true,
          message: `${input.type} message broadcasted to all devices`,
        };
      } catch (error) {
        console.error("Error broadcasting message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to broadcast message",
        });
      }
    }),

  // Get MQTT connection status
  getMqttStatus: protectedProcedure
    .query(async () => {
      try {
        const stats = mqttService.getConnectionStats();
        return {
          connected: stats.connected,
          reconnectAttempts: stats.reconnectAttempts,
          clientId: stats.clientId,
        };
      } catch (error) {
        console.error("Error getting MQTT status:", error);
        return {
          connected: false,
          reconnectAttempts: 0,
          clientId: null,
        };
      }
    }),
});