"use client";

import { Button } from "@/app/_components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/_components/ui/form";
import { Input } from "@/app/_components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { FcMember } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";

const fcMemberFormSchema = z.object({
  member_name: z.string().min(1, "Name is required"),
  member_phone: z.string().min(1, "Phone is required"),
  member_email: z.string().email("Invalid email address"),
  status: z.enum([
    "new",
    "contacted",
    "follow_up",
    "interested",
    "not_interested",
    "pending",
    "scheduled",
    "converted",
    "rejected",
    "inactive",
  ]),
});

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
];

type FCMemberFormData = z.infer<typeof fcMemberFormSchema>;

interface FCMemberFormProps {
  initialData?: FcMember;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FCMemberForm({
  initialData,
  onSuccess,
  onCancel,
}: FCMemberFormProps) {
  const { toast } = useToast();
  const utils = api.useContext();

  const form = useForm<FCMemberFormData>({
    resolver: zodResolver(fcMemberFormSchema),
    defaultValues: initialData || {
      member_name: "",
      member_phone: "",
      member_email: "",
      status: "new",
    },
  });

  const createMutation = api.fcMember.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member created successfully",
      });
      utils.fcMember.getAll.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.fcMember.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member updated successfully",
      });
      utils.fcMember.getAll.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FCMemberFormData) => {
    if (initialData) {
      updateMutation.mutate({
        id: initialData.id,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="member_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="member_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="member_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {initialData ? "Update" : "Create"} Member
          </Button>
        </div>
      </form>
    </Form>
  );
}