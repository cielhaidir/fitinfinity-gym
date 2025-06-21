"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Upload, Loader2, Rocket, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Device {
  id: string;
  name: string;
  isActive: boolean;
  firmwareVersion?: string;
  mqttConnected?: boolean;
}

interface FirmwareManagementProps {
  devices: Device[];
}

export function FirmwareManagement({ devices }: FirmwareManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const deployFirmwareMutation = api.mqtt.deployFirmware.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Firmware deployed to ${result.successful} of ${result.total} devices`
      );
      if (result.failed > 0) {
        toast.warning(`${result.failed} devices failed to receive the update`);
      }
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to deploy firmware: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFirmwareFile(null);
    setVersion("");
    setReleaseNotes("");
    setSelectedDevices([]);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.bin')) {
        toast.error("Please select a .bin firmware file");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Firmware file too large (max 10MB)");
        return;
      }
      
      setFirmwareFile(file);
      
      // Auto-generate version from filename if not set
      if (!version) {
        const filename = file.name.replace('.bin', '');
        setVersion(filename);
      }
    }
  };

  const handleDeviceSelection = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    }
  };

  const selectAllDevices = () => {
    const activeDevices = devices.filter(d => d.isActive).map(d => d.id);
    setSelectedDevices(activeDevices);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/octet-stream;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDeploy = async () => {
    if (!firmwareFile) {
      toast.error("Please select a firmware file");
      return;
    }

    if (!version.trim()) {
      toast.error("Please enter a version number");
      return;
    }

    if (selectedDevices.length === 0) {
      toast.error("Please select at least one device");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Convert file to base64
      const base64Data = await fileToBase64(firmwareFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Deploy firmware
      await deployFirmwareMutation.mutateAsync({
        deviceIds: selectedDevices,
        version: version.trim(),
        firmwareFile: base64Data,
        releaseNotes: releaseNotes.trim() || undefined,
      });

    } catch (error) {
      console.error("Error deploying firmware:", error);
      toast.error("Failed to deploy firmware");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const activeDevices = devices.filter(d => d.isActive);
  const connectedDevices = activeDevices.filter(d => d.mqttConnected);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Rocket className="mr-2 h-4 w-4" />
          Deploy Firmware
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deploy Firmware Update</DialogTitle>
          <DialogDescription>
            Upload and deploy firmware (.bin) files to ESP32 devices via MQTT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Device Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {connectedDevices.length}
                  </div>
                  <div className="text-muted-foreground">Connected</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {activeDevices.length}
                  </div>
                  <div className="text-muted-foreground">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600">
                    {devices.length}
                  </div>
                  <div className="text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Firmware Upload */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Firmware File</Label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  ESP32 firmware files (.bin) up to 10MB
                </p>
              </div>
              <Input
                type="file"
                accept=".bin"
                onChange={handleFileSelect}
                className="mt-4"
              />
            </div>

            {firmwareFile && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <div className="text-green-600">✓</div>
                <div className="flex-1">
                  <div className="font-medium text-green-800">
                    {firmwareFile.name}
                  </div>
                  <div className="text-sm text-green-600">
                    {(firmwareFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Version and Release Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., v3.0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="releaseNotes">Release Notes</Label>
              <Textarea
                id="releaseNotes"
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="What's new in this version..."
                rows={3}
              />
            </div>
          </div>

          {/* Device Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Target Devices</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllDevices}
                disabled={activeDevices.length === 0}
              >
                Select All Active
              </Button>
            </div>

            {activeDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>No active devices available</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {activeDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center space-x-3 p-3 border-b last:border-b-0"
                  >
                    <Checkbox
                      id={device.id}
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={(checked) =>
                        handleDeviceSelection(device.id, !!checked)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={device.id}
                        className="font-medium cursor-pointer"
                      >
                        {device.name}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={device.mqttConnected ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {device.mqttConnected ? "Connected" : "Offline"}
                        </Badge>
                        {device.firmwareVersion && (
                          <span className="text-xs text-gray-500">
                            v{device.firmwareVersion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDevices.length > 0 && (
              <p className="text-sm text-gray-600">
                Selected {selectedDevices.length} device(s) for firmware update
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {uploadProgress < 100
                  ? `Uploading firmware... ${uploadProgress}%`
                  : "Deploying to devices..."}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={
                !firmwareFile ||
                !version.trim() ||
                selectedDevices.length === 0 ||
                isUploading ||
                deployFirmwareMutation.isPending
              }
            >
              {isUploading || deployFirmwareMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy Firmware
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}