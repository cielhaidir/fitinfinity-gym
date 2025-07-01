import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { prisma } from '../prisma';
import { DeviceStatus } from '@prisma/client';

interface EnrollmentData {
  employeeId: string;
  employeeName: string;
  deviceId: string;
  fingerprintSlot: number;
}

interface FirmwareInfo {
  version: string;
  downloadUrl: string;
  checksum: string;
  size: number;
  releaseNotes?: string;
}

interface AttendanceLog {
  type: 'fingerprint' | 'rfid';
  id: string;
  timestamp: string;
  deviceId: string;
}

class MQTTService extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    const options: mqtt.IClientOptions = {
      host: process.env.MQTT_HOST || 'localhost',
      port: parseInt(process.env.MQTT_PORT || '1883'),
      username: process.env.MQTT_USERNAME || 'fitinfinity_mqtt',
      password: process.env.MQTT_PASSWORD || 'mqtt_p@ssw0rd_f1n1t3',
      clientId: `fitinfinity-server-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      keepalive: 60,
    };

    this.client = mqtt.connect(options);

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Failed to create MQTT client'));
        return;
      }

      this.client.on('connect', () => {
        // console.log('MQTT Connected to broker');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupSubscriptions();
        this.emit('connected');
        resolve();
      });

      this.client.on('error', (error: Error) => {
        // console.error('MQTT Connection Error:', error);
        this.isConnected = false;
        this.emit('error', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        // console.log(`MQTT Reconnecting... (attempt ${this.reconnectAttempts})`);
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          // console.error('MQTT Max reconnection attempts reached');
          this.client?.end();
        }
      });

      this.client.on('close', () => {
        // console.log('MQTT Connection closed');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.client.on('message', this.handleMessage.bind(this));
    });
  }

  private setupSubscriptions(): void {
    if (!this.client || !this.isConnected) return;

    // Subscribe to all device topics
    const subscriptions = [
      'fitinfinity/devices/+/enrollment/status',
      'fitinfinity/devices/+/status/+',
      'fitinfinity/devices/+/ota/+',
      'fitinfinity/devices/+/config/wifi/+',
      'fitinfinity/admin/+',
    ];

    subscriptions.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error: Error | null) => {
        if (error) {
          // console.error(`Failed to subscribe to ${topic}:`, error);
        } else {
          // console.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const payload = JSON.parse(message.toString());
      // console.log(`MQTT Message received - Topic: ${topic}, Payload:`, payload);

      // Parse topic structure
      const topicParts = topic.split('/');
      
      if (topicParts[0] === 'fitinfinity' && topicParts[1] === 'devices') {
        const deviceId = topicParts[2];
        const category = topicParts[3];
        const action = topicParts[4];

        if (deviceId && category && action) {
          await this.handleDeviceMessage(deviceId, category, action, payload);
        }
      } else if (topicParts[0] === 'fitinfinity' && topicParts[1] === 'admin') {
        const adminAction = topicParts[2];
        if (adminAction) {
          this.handleAdminMessage(adminAction, payload);
        }
      }
    } catch (error) {
      // console.error('Error parsing MQTT message:', error);
      // console.error('Topic:', topic);
      // console.error('Message:', message.toString());
    }
  }

  private async handleDeviceMessage(deviceId: string, category: string, action: string, payload: any): Promise<void> {
    switch (category) {
      case 'enrollment':
        if (action === 'status') {
          this.emit('enrollmentStatus', { deviceId, ...payload });
          // Update enrollment status in database
          await this.handleEnrollmentStatus(deviceId, payload);
          // Update device lastSeen for enrollment activity
          await this.updateDeviceStatus(deviceId, DeviceStatus.ONLINE, payload);
        }
        break;

      case 'status':
        if (action === 'online' || action === 'heartbeat') {
          await this.updateDeviceStatus(deviceId, DeviceStatus.ONLINE, payload);
        } else if (action === 'error') {
          await this.updateDeviceStatus(deviceId, DeviceStatus.ERROR, payload);
        }
        break;

      case 'ota':
        this.emit('otaUpdate', {
          deviceId,
          action,
          ...payload
        });
        // Update device lastSeen for OTA activity
        await this.updateDeviceStatus(deviceId, DeviceStatus.ONLINE, payload);
        break;

      case 'config':
        if (action === 'wifi') {
          this.emit('wifiConfig', {
            deviceId,
            ...payload
          });
          // Update device lastSeen for wifi config activity
          await this.updateDeviceStatus(deviceId, DeviceStatus.ONLINE, payload);
        }
        break;
    }
  }

  private handleAdminMessage(action: string, payload: any): void {
    this.emit('adminMessage', { action, ...payload });
  }

  // Enrollment Management
  async triggerEnrollment(deviceId: string, enrollmentData: EnrollmentData): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const topic = `fitinfinity/devices/${deviceId}/enrollment/request`;
    const payload = JSON.stringify({
      ...enrollmentData,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error?: Error) => {
        if (error) {
          // console.error('Failed to publish enrollment request:', error);
          reject(error);
        } else {
          // console.log(`Enrollment request sent to device ${deviceId}`);
          resolve(true);
        }
      });
    });
  }

  // Switch device to enrollment mode
  async switchEnrollmentMode(deviceId: string, enable: boolean): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const topic = `fitinfinity/devices/${deviceId}/enrollment/mode/switch`;
    const payload = JSON.stringify({
      enrollmentMode: enable,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  }

  // OTA Update Management
  async publishFirmwareUpdate(deviceId: string, firmwareInfo: FirmwareInfo): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const topic = `fitinfinity/devices/${deviceId}/ota/available`;
    const payload = JSON.stringify({
      ...firmwareInfo,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          // console.log(`Firmware update notification sent to device ${deviceId}`);
          resolve(true);
        }
      });
    });
  }

  // Generic device publishing
  async publishToDevice(deviceId: string, subtopic: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const topic = `fitinfinity/devices/${deviceId}/${subtopic}`;
    const payload = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  }

  // Broadcast to all devices
  async broadcastToDevices(subtopic: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const topic = `fitinfinity/system/broadcast/${subtopic}`;
    const payload = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          // console.log(`Broadcast message sent: ${subtopic}`);
          resolve(true);
        }
      });
    });
  }

  // Connection status
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(true, {}, () => {
          // console.log('MQTT Client disconnected');
          this.isConnected = false;
          resolve();
        });
      });
    }
  }

  // Update device status in database
  private async updateDeviceStatus(deviceId: string, status: 'ONLINE' | 'OFFLINE' | 'ERROR', payload: any): Promise<void> {
    try {
      const updateData: any = {
        lastSeen: new Date(),
        status: status,
        mqttConnected: status === 'ONLINE',
        lastMqttMessage: new Date(),
      };

      // Add optional fields if present in payload
      if (payload.uptime) {
        updateData.uptime = payload.uptime;
      }
      if (payload.wifiRSSI) {
        updateData.signalStrength = payload.wifiRSSI;
      }
      if (payload.freeHeap) {
        // Store free heap info in a way that fits the schema
      }
      if (payload.temperature) {
        updateData.temperature = payload.temperature;
      }
      if (payload.version) {
        updateData.firmwareVersion = payload.version;
      }
      if (status === 'ERROR' && payload.error) {
        updateData.errorMessage = payload.error;
        updateData.errorCount = { increment: 1 };
      } else if (status === 'ONLINE') {
        updateData.errorMessage = null; // Clear error when device is online
      }

      // Update or create device record
      await prisma.device.upsert({
        where: { id: deviceId },
        update: updateData,
        create: {
          id: deviceId,
          name: `Device ${deviceId.slice(-8)}`, // Use last 8 chars as name
          accessKey: 'auto-generated', // Will need to be updated manually
          ...updateData,
        },
      });

      // console.log(`Device ${deviceId} updated - Status: ${status}`);
    } catch (error) {
      // console.error(`Error updating device ${deviceId}:`, error);
    }
  }

  // Handle enrollment status updates from ESP32 devices
  private async handleEnrollmentStatus(deviceId: string, payload: any): Promise<void> {
    try {
      const { employeeId, status, fingerprintId } = payload;
      
      if (!employeeId || !status) {
        // console.error('Enrollment status missing required fields');
        return;
      }

      // Update employee enrollment status in database
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          enrollmentStatus: status,
          fingerprintId: status === 'ENROLLED' ? fingerprintId : null,
          deviceId: status === 'PENDING' ? deviceId : null,
        },
      });

      // console.log(`Enrollment status updated for employee ${employeeId}: ${status}`);
      
    } catch (error) {
      // console.error('Error handling enrollment status:', error);
    }
  }

  // Send enrollment request to specific device (called from employee management)
  async sendEnrollmentRequest(deviceId: string, employeeId: string, employeeName: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

  //   const employee = await prisma.employee.findUnique({
  //     where: { id: employeeId },
  // });

  //  let fingerprintSlot = 1;

  //   if (employee?.fingerprintId) {
  //       // Sudah ada fingerprint sebelumnya
  //       fingerprintSlot = employee.fingerprintId;
  //   } else {
  //       // Cari slot baru
  //       fingerprintSlot = await this.getNextFingerprintSlot(deviceId);
  //   }
    

    const topic = `fitinfinity/devices/${deviceId}/enrollment/request`;
    
    const payload = JSON.stringify({
      employeeId,
      employeeName,
      timestamp: new Date().toISOString(),
      fingerprintSlot: await this.getNextFingerprintSlot(deviceId),
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error?: Error) => {
        if (error) {
          // console.error('Failed to publish enrollment request:', error);
          reject(error);
        } else {
          // console.log(`Enrollment request sent to device ${deviceId} for employee ${employeeName}`);
          resolve(true);
        }
      });
    });
  }

  // Helper to get next available fingerprint slot for device
  private async getNextFingerprintSlot(deviceId: string): Promise<number> {
    try {
      // Get highest fingerprint ID used by this device
      const lastEmployee = await prisma.employee.findFirst({
        where: {
          // deviceId: deviceId,
          fingerprintId: { not: null },
        },
        orderBy: {
          fingerprintId: 'desc',
        },
      });

      return lastEmployee?.fingerprintId ? lastEmployee.fingerprintId + 1 : 1;
    } catch (error) {
      // console.error('Failed to get next fingerprint slot:', error);
      return 1; // Default to slot 1
    }
  }

  // Get connection stats
  getConnectionStats() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      clientId: this.client?.options.clientId || null,
    };
  }
}

// Create singleton instance
export const mqttService = new MQTTService();

// Auto-connect when module is imported
if (process.env.NODE_ENV !== 'test') {
  mqttService.connect().catch(error => {
    // console.error('Failed to connect to MQTT broker:', error);
  });
}