"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";

interface DeviceSelectProps {
  onSelect: (device: { id: string; accessKey: string }) => void;
  disabled?: boolean;
}

export function DeviceSelect({ onSelect, disabled }: DeviceSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDevice, setSelectedDevice] = React.useState<string>();

  const { data: devices, isLoading } = api.device.list.useQuery();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between"
        >
          {selectedDevice
            ? devices?.find((device) => device.id === selectedDevice)?.name
            : isLoading 
              ? "Loading devices..."
              : "Select device..."}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search devices..." />
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading devices...
            </div>
          ) : devices && devices.length === 0 ? (
            <CommandEmpty>No devices found.</CommandEmpty>
          ) : (
            <>
              <CommandEmpty>No device found.</CommandEmpty>
              <CommandGroup>
                {devices?.map((device) => (
                  <CommandItem
                    key={device.id}
                    value={device.id}
                    onSelect={() => {
                      setSelectedDevice(device.id);
                      onSelect({ id: device.id, accessKey: device.accessKey });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedDevice === device.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {device.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}