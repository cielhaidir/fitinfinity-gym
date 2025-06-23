import { mqttService } from '../mqtt/mqttService';
import { db } from '../../server/db';

interface WifiCredentials {
  ssid: string;
  password: string;
  deviceId: string;
}

interface WifiNetwork {
  ssid: string;
  rssi: number;
  encryption: string;
}

interface WifiScanResult {
  deviceId: string;
  networks: WifiNetwork[];
  timestamp: string;
}

class WifiConfigService {
  constructor() {
    // Listen for WiFi scan results from devices
    mqttService.on('wifiConfig', this.handleWifiMessage.bind(this));
  }

  private async handleWifiMessage(data: any) {
    try {
      const { deviceId, networks, action } = data;

      if (action === 'scan' && networks) {
        await this.storeAvailableNetworks(deviceId, networks);
        
        // Notify admin dashboard about new scan results
        await mqttService.publishToDevice('admin', 'wifi/scan_results', {
          deviceId,
          networks,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'status') {
        // Handle WiFi connection status updates
        await this.updateWifiStatus(deviceId, data);
      }
    } catch (error) {
      console.error('Error handling WiFi message:', error);
    }
  }

  async handleWifiRequest(deviceId: string, availableNetworks: WifiNetwork[]) {
    try {
      // Store available networks for admin selection
      await this.storeAvailableNetworks(deviceId, availableNetworks);
      
      // Notify admin dashboard
      await mqttService.publishToDevice('admin', 'wifi/scan_results', {
        deviceId,
        networks: availableNetworks,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'WiFi scan results received' };
    } catch (error) {
      console.error('Error handling WiFi request:', error);
      throw error;
    }
  }

  async configureWifi(deviceId: string, credentials: WifiCredentials) {
    try {
      // Validate inputs
      if (!deviceId || !credentials.ssid) {
        throw new Error('Device ID and SSID are required');
      }

      // Publish WiFi credentials to device
      const success = await mqttService.publishToDevice(
        deviceId, 
        'config/wifi/response', 
        {
          ssid: credentials.ssid,
          password: credentials.password,
          timestamp: new Date().toISOString(),
          action: 'configure'
        }
      );

      if (success) {
        // Store configuration in database
        await this.storeWifiConfig(deviceId, credentials.ssid);
        
        // Log the configuration attempt
        console.log(`WiFi configuration sent to device ${deviceId} for network ${credentials.ssid}`);
        
        return { success: true, message: 'WiFi configuration sent to device' };
      }
      
      throw new Error('Failed to send WiFi configuration');
    } catch (error) {
      console.error('WiFi configuration error:', error);
      throw error;
    }
  }

  async requestWifiScan(deviceId: string) {
    try {
      // Request device to scan for available networks
      const success = await mqttService.publishToDevice(
        deviceId,
        'config/wifi/scan',
        {
          action: 'scan',
          timestamp: new Date().toISOString()
        }
      );

      if (success) {
        return { success: true, message: 'WiFi scan request sent to device' };
      }
      
      throw new Error('Failed to send WiFi scan request');
    } catch (error) {
      console.error('WiFi scan request error:', error);
      throw error;
    }
  }

  async getDeviceWifiInfo(deviceId: string) {
    try {
      // Try to get device info from database
      const device = await db.device.findUnique({
        where: { deviceId },
        select: {
          availableNetworks: true,
          lastNetworkScan: true,
          configuredWifi: true,
          wifiStatus: true,
          lastSeen: true
        }
      });

      if (!device) {
        // If device doesn't exist, create it
        await db.device.create({
          data: {
            deviceId,
            name: `ESP32-${deviceId}`,
            type: 'ESP32',
            accessKey: `key_${deviceId}_${Date.now()}`,
            status: 'OFFLINE',
            lastSeen: new Date()
          }
        });

        return {
          networks: [],
          lastScan: null,
          configuredWifi: null,
          wifiStatus: 'unknown'
        };
      }

      return {
        networks: device.availableNetworks ? JSON.parse(device.availableNetworks) : [],
        lastScan: device.lastNetworkScan,
        configuredWifi: device.configuredWifi,
        wifiStatus: device.wifiStatus || 'unknown'
      };
    } catch (error) {
      console.error('Error getting device WiFi info:', error);
      throw error;
    }
  }

  private async storeAvailableNetworks(deviceId: string, networks: WifiNetwork[]) {
    try {
      // Ensure device exists
      await db.device.upsert({
        where: { deviceId },
        update: {
          availableNetworks: JSON.stringify(networks),
          lastNetworkScan: new Date(),
          lastSeen: new Date()
        },
        create: {
          deviceId,
          name: `ESP32-${deviceId}`,
          type: 'ESP32',
          accessKey: `key_${deviceId}_${Date.now()}`,
          status: 'ONLINE',
          availableNetworks: JSON.stringify(networks),
          lastNetworkScan: new Date(),
          lastSeen: new Date()
        }
      });

      console.log(`Stored ${networks.length} available networks for device ${deviceId}`);
    } catch (error) {
      console.error('Error storing available networks:', error);
      throw error;
    }
  }

  private async storeWifiConfig(deviceId: string, ssid: string) {
    try {
      await db.device.upsert({
        where: { deviceId },
        update: {
          configuredWifi: ssid,
          lastConfigured: new Date(),
          wifiStatus: 'configuring'
        },
        create: {
          deviceId,
          name: `ESP32-${deviceId}`,
          type: 'ESP32',
          accessKey: `key_${deviceId}_${Date.now()}`,
          status: 'ONLINE',
          configuredWifi: ssid,
          lastConfigured: new Date(),
          wifiStatus: 'configuring'
        }
      });

      console.log(`Stored WiFi configuration for device ${deviceId}: ${ssid}`);
    } catch (error) {
      console.error('Error storing WiFi config:', error);
      throw error;
    }
  }

  private async updateWifiStatus(deviceId: string, statusData: any) {
    try {
      const { connected, ssid, ip, error } = statusData;
      
      await db.device.upsert({
        where: { deviceId },
        update: {
          wifiStatus: connected ? 'connected' : 'disconnected',
          configuredWifi: ssid || undefined,
          lastSeen: new Date(),
          ...(error && { errorMessage: error })
        },
        create: {
          deviceId,
          name: `ESP32-${deviceId}`,
          type: 'ESP32',
          accessKey: `key_${deviceId}_${Date.now()}`,
          status: connected ? 'ONLINE' : 'OFFLINE',
          wifiStatus: connected ? 'connected' : 'disconnected',
          configuredWifi: ssid || null,
          lastSeen: new Date(),
          ...(error && { errorMessage: error })
        }
      });

      console.log(`Updated WiFi status for device ${deviceId}: ${connected ? 'connected' : 'disconnected'}`);
    } catch (error) {
      console.error('Error updating WiFi status:', error);
      throw error;
    }
  }

  // Get all devices with their WiFi status
  async getAllDevicesWifiStatus() {
    try {
      const devices = await db.device.findMany({
        select: {
          deviceId: true,
          name: true,
          configuredWifi: true,
          wifiStatus: true,
          lastSeen: true,
          lastNetworkScan: true,
          availableNetworks: true
        },
        orderBy: {
          lastSeen: 'desc'
        }
      });

      return devices.map((device: any) => ({
        ...device,
        availableNetworks: device.availableNetworks ? JSON.parse(device.availableNetworks) : []
      }));
    } catch (error) {
      console.error('Error getting all devices WiFi status:', error);
      throw error;
    }
  }
}

export const wifiConfigService = new WifiConfigService();