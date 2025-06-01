"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/_components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Loader2 } from "lucide-react";
import { EmailTemplate, EmailType, emailTemplateSchema } from "./schema";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { siteConfig } from "@/lib/config/siteConfig";

interface EmailTemplateFormProps {
  initialData?: EmailTemplate;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EmailTemplateForm({ initialData, onSuccess, onCancel }: EmailTemplateFormProps) {
  const form = useForm<EmailTemplate>({
    resolver: zodResolver(emailTemplateSchema) as any,
    defaultValues: initialData || {
      name: "",
      type: EmailType.MEMBERSHIP_CONFIRMATION,
      subject: "",
      htmlContent: "",
      textContent: "",
      variables: {},
      isActive: true,
    },
  });

  const createTemplateMutation = api.email.createTemplate.useMutation();
  const updateTemplateMutation = api.email.updateTemplate.useMutation();

  const onSubmit = async (data: EmailTemplate) => {
    try {
      if (initialData?.id) {
        await updateTemplateMutation.mutateAsync({
          id: initialData.id,
          data,
        });
        toast.success("Email template updated successfully");
      } else {
        await createTemplateMutation.mutateAsync(data);
        toast.success("Email template created successfully");
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(`Failed to save template: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-screen overflow-y-auto pb-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Configure your email template content and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(EmailType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, " ").toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Welcome to Fit Infinity!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="htmlContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTML Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="<h1>Welcome!</h1>"
                      className="font-mono max-h-[400px] overflow-y-auto"
                      rows={15}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground mt-2 max-h-[200px] overflow-y-auto p-2 border rounded">
                    <p>Available variables:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{'{{memberName}}'} - Member's name</li>
                      <li>{'{{packageName}}'} - Package name</li>
                      <li>{'{{receiptNumber}}'} - Receipt number</li>
                      <li>{'{{paymentDate}}'} - Payment date</li>
                      <li>{'{{paymentStatus}}'} - Payment status</li>
                      <li>{'{{statusClass}}'} - Status styling class</li>
                      <li>{'{{duration}}'} - Package duration</li>
                      <li>{'{{paymentMethod}}'} - Payment method</li>
                      <li>{'{{currency}}'} - Currency symbol</li>
                      <li>{'{{totalAmount}}'} - Total payment amount</li>
                      <li>{'{{subtotal}}'} - Subtotal (if discount)</li>
                      <li>{'{{discount}}'} - Discount amount (if any)</li>
                      <li>{'{{personalTrainer}}'} - Has trainer (boolean)</li>
                      <li>{'{{trainerName}}'} - Trainer name (if applicable)</li>
                      <li>{'{{memberEmail}}'} - Member's email</li>
                      <li>{'{{membershipId}}'} - Membership ID</li>
                      <li>{'{{startDate}}'} - Subscription start date</li>
                      <li>{'{{endDate}}'} - Subscription end date</li>
                      <li>{'{{portalUrl}}'} - Member portal URL ({siteConfig.portalUrl})</li>
                      <li>{'{{supportPhone}}'} - Support phone ({siteConfig.supportPhone})</li>
                      <li>{'{{supportEmail}}'} - Support email ({siteConfig.supportEmail})</li>
                      <li>{'{{currentYear}}'} - Current year</li>
                      <li>{'{{address}}'} - Business address ({siteConfig.address})</li>
                      <li>{'{{logoUrl}}'} - Logo image URL ({siteConfig.logoUrl})</li>
                    </ul>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="textContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plain Text Content (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Welcome!"
                      rows={5}
                      className="max-h-[200px] overflow-y-auto"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-2 pb-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
          >
            {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {initialData ? "Update" : "Create"} Template
          </Button>
        </div>
      </form>
    </Form>
  );
}