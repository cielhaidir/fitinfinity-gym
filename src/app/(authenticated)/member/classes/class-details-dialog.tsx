"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Class } from "./types";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface ClassDetailsDialogProps {
  class_: Class | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasValidSubscription: boolean;
  isRegistrationEnabled?: boolean;
}

export function ClassDetailsDialog({
  class_,
  open,
  onOpenChange,
  hasValidSubscription,
  isRegistrationEnabled = true,
}: ClassDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("details");
  const utils = api.useUtils();
  const router = useRouter();
  const { data: session } = useSession();

  const registerMutation = api.memberClass.register.useMutation({
    onSuccess: () => {
      toast.success("Successfully registered for class");
      void utils.memberClass.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = api.memberClass.cancelRegistration.useMutation({
    onSuccess: () => {
      toast.success("Registration cancelled");
      void utils.memberClass.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinWaitlistMutation = api.memberClass.joinWaitlist.useMutation({
    onSuccess: () => {
      toast.success("Successfully joined waitlist");
      void utils.memberClass.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!class_) return null;

  const registeredCount = class_.registeredMembers?.length ?? 0;
  const isFull = class_.limit ? registeredCount >= class_.limit : false;
  const waitlistCount = class_.waitingList?.length ?? 0;

  const isRegistered = class_.registeredMembers?.some(
    (member) => member.member.user.name === session?.user?.name,
  );

  const isOnWaitlist = class_.waitingList?.some(
    (member) => member.member.user.name === session?.user?.name,
  );

  const handleRegister = () => {
    if (!hasValidSubscription) {
      // Redirect to payment page
      router.push(`/checkout/class/${class_.id}`);
      return;
    }

    if (class_?.id) {
      registerMutation.mutate({ classId: class_.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{class_.name}</DialogTitle>
          <DialogDescription>with {class_.instructorName}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="members">
              Members ({registeredCount})
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              Waitlist ({waitlistCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-2">
              <p>
                <strong>Duration:</strong> {class_.duration} minutes
              </p>
              <p>
                <strong>Capacity:</strong> {class_.limit ?? "Unlimited"}
              </p>
              <p>
                <strong>Available Spots:</strong>{" "}
                {class_.limit ? class_.limit - registeredCount : "∞"}
              </p>
              <p>
                <strong>Schedule:</strong>{" "}
                {new Date(class_.schedule).toLocaleString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p>
                <strong>Waiting List:</strong> {waitlistCount} members
              </p>
              {/* {!hasValidSubscription && (
                <p>
                  <strong>Price:</strong> Rp{" "}
                  {class_.price.toLocaleString("id-ID")}
                </p>
              )} */}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="space-y-2">
              {class_.registeredMembers?.map((member) => (
                <div key={member.id} className="text-sm">
                  {member.member.user.name}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="waitlist">
            <div className="space-y-2">
              {class_.waitingList?.map((member) => (
                <div key={member.id} className="text-sm">
                  {member.member.user.name}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {!isRegistrationEnabled ? (
            <div className="w-full text-center">
              <Button disabled className="w-full">
                Registration Opens H-1 (1 Day Before)
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                Registration will be available 1 day before the class
              </p>
            </div>
          ) : isRegistered ? (
            <Button
              variant="destructive"
              onClick={async () => {
                if (!class_?.id) return;
                cancelMutation.mutate({ classId: class_.id });
              }}
              disabled={cancelMutation.isPending}
            >
              Cancel Registration
            </Button>
          ) : isOnWaitlist ? (
            <Button disabled>On Waiting List</Button>
          ) : isFull ? (
            <Button
              onClick={() => {
                if (class_?.id) {
                  joinWaitlistMutation.mutate({ classId: class_.id });
                }
              }}
              disabled={joinWaitlistMutation.isPending}
            >
              Join Waiting List
            </Button>
          ) : (
            <Button
              onClick={handleRegister}
              disabled={hasValidSubscription == false}
              className="bg-infinity"
            >
              Register for Class
            </Button>
            
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
