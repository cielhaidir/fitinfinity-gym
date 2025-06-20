import mqtt from 'mqtt';
import { EventEmitter } from 'events';

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

interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  version?: string;
  error?: string;
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
        console.log('MQTT Connected to broker');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupSubscriptions();
        this.emit('connected');
        resolve();
      });

      this.client.on('error', (error: Error) => {
        console.error('MQTT Connection Error:', error);
        this.isConnected = false;
        this.emit('error', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`MQTT Reconnecting... (attempt ${this.reconnectAttempts})`);
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          console.error('MQTT Max reconnection attempts reached');
          this.client?.end();
        }
      });

      this.client.on('close', () => {
        console.log('MQTT Connection closed');
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
      'fitinfinity/devices/+/attendance/+',
      'fitinfinity/devices/+/status/+',
      'fitinfinity/devices/+/ota/+',
      'fitinfinity/devices/+/config/wifi/+',
      'fitinfinity/admin/+',
    ];

    subscriptions.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error: Error | null) => {
        if (error) {
          console.error(`Failed to subscribe to ${topic}:`, error);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      console.log(`MQTT Message received - Topic: ${topic}, Payload:`, payload);

      // Parse topic structure
      const topicParts = topic.split('/');
      
      if (topicParts[0] === 'fitinfinity' && topicParts[1] === 'devices') {
        const deviceId = topicParts[2];
        const category = topicParts[3];
        const action = topicParts[4];

        if (deviceId && category && action) {
          this.handleDeviceMessage(deviceId, category, action, payload);
        }
      } else if (topicParts[0] === 'fitinfinity' && topicParts[1] === 'admin') {
        const adminAction = topicParts[2];
        if (adminAction) {
          this.handleAdminMessage(adminAction, payload);
        }
      }
    } catch (error) {
      console.error('Error parsing MQTT message:', error);
      console.error('Topic:', topic);
      console.error('Message:', message.toString());
    }
  }

  private handleDeviceMessage(deviceId: string, category: string, action: string, payload: any): void {
    switch (category) {
      case 'enrollment':
        if (action === 'status') {
          this.emit('enrollmentStatus', { deviceId, ...payload });
        }
        break;

      case 'attendance':
        this.emit('attendanceLog', { 
          deviceId, 
          type: action, 
          ...payload 
        } as AttendanceLog);
        break;

      case 'status':
        if (action === 'online' || action === 'heartbeat') {
          this.emit('deviceStatus', {
            deviceId,
            status: 'online',
            lastSeen: new Date().toISOString(),
            ...payload
          } as DeviceStatus);
        } else if (action === 'error') {
          this.emit('deviceStatus', {
            deviceId,
            status: 'error',
            lastSeen: new Date().toISOString(),
            error: payload.error || 'Unknown error',
            ...payload
          } as DeviceStatus);
        }
        break;

      case 'ota':
        this.emit('otaUpdate', {
          deviceId,
          action,
          ...payload
        });
        break;

      case 'config':
        if (action === 'wifi') {
          this.emit('wifiConfig', {
            deviceId,
            ...payload
          });
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
          console.error('Failed to publish enrollment request:', error);
          reject(error);
        } else {
          console.log(`Enrollment request sent to device ${deviceId}`);
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
          console.log(`Firmware update notification sent to device ${deviceId}`);
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
          console.log(`Broadcast message sent: ${subtopic}`);
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
          console.log('MQTT Client disconnected');
          this.isConnected = false;
          resolve();
        });
      });
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
    console.error('Failed to connect to MQTT broker:', error);
  });
}