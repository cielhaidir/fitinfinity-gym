"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

import {
  Sheet,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { DeviceForm } from "./device-form";
import { FirmwareManagement } from "./firmware-management";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function DevicePage() {
  const [open, setOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<{
    id: string;
    name: string;
    accessKey: string;
  } | null>(null);

  const utils = api.useUtils();
  const { data: devices, isLoading } = api.device.list.useQuery();

  const deleteMutation = api.device.delete.useMutation({
    onSuccess: () => {
      toast.success("Device deleted successfully");
      void utils.device.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:employees"]}>
      <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">ESP32 Devices</h1>
        <div className="flex gap-2">
          <FirmwareManagement devices={devices || []} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDevice(null);
                }}
              >
                Add Device
              </Button>
            </SheetTrigger>
            <DeviceForm
              device={selectedDevice}
              onSuccess={() => {
                setOpen(false);
                setSelectedDevice(null);
              }}
            />
          </Sheet>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>Access Key</TableHead>
              <TableHead>Firmware</TableHead>
              <TableHead>MQTT</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : devices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No devices found
                </TableCell>
              </TableRow>
            ) : (
              devices?.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.id}</TableCell>
                  <TableCell>{device.accessKey}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {(device as any).firmwareVersion || "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (device as any).mqttConnected
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {(device as any).mqttConnected ? "Connected" : "Offline"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {device.lastSeen
                      ? new Date(device.lastSeen).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        device.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {device.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDevice(device)}
                        >
                          Edit
                        </Button>
                      </SheetTrigger>
                      <DeviceForm
                        device={device}
                        onSuccess={() => setSelectedDevice(null)}
                      />
                    </Sheet>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(device.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>
    </ProtectedRoute>
  );
}