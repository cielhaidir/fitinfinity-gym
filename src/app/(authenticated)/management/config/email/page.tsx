"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { DataTable } from "@/app/_components/datatable/data-table";
import {
  createEmailConfigColumns,
  createEmailTemplateColumns,
} from "./columns";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { EmailConfigForm } from "./email-config-form";
import { EmailTemplateForm } from "./email-template-form";
import { Loader2 } from "lucide-react";
import type { EmailConfig, EmailTemplate } from "./schema";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function EmailConfigPage() {
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // SMTP Config mutations
  const deleteConfigMutation = api.email.deleteConfig.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const setActiveMutation = api.email.setActiveConfig.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const testConnectionMutation = api.email.testConnection.useMutation();

  const configColumns = createEmailConfigColumns({
    onEditConfig: (config) => {
      setEditingConfig(config);
      setOpen(true);
    },
    onDeleteConfig: (config) => {
      if (
        window.confirm("Are you sure you want to delete this configuration?")
      ) {
        deleteConfigMutation.mutateAsync({ id: config.id || "" });
      }
    },
    onTestConnection: async (config) => {
      try {
        const result = await testConnectionMutation.mutateAsync({
          id: config.id || "",
        });
        if (result.success) {
          alert("Connection test successful!");
        } else {
          alert(`Connection test failed: ${result.error}`);
        }
      } catch (error) {
        alert(
          `Error testing connection: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    onSetActive: (config) => {
      setActiveMutation.mutateAsync({ id: config.id || "" });
    },
  });

  // Template mutations
  const deleteTemplateMutation = api.email.deleteTemplate.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data: configs, isLoading } = api.email.listConfigs.useQuery();
  const { data: templates, isLoading: isLoadingTemplates } =
    api.email.listTemplates.useQuery();
  return (
       <ProtectedRoute requiredPermissions={["menu:configs"]}>
    <div className="container mx-auto space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Configuration</h1>
        <div className="space-x-2">
          <Button onClick={() => setOpen(true)}>Add SMTP Config</Button>
          <Button onClick={() => setIsTemplateDialogOpen(true)}>
            Add Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <DataTable
                columns={configColumns}
                data={{
                  items: configs || [],
                  total: configs?.length || 0,
                  page: 1,
                  limit: 10,
                }}
                searchKey="name"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <DataTable
                columns={createEmailTemplateColumns({
                  onEditTemplate: (template) => {
                    setEditingTemplate(template);
                    setIsTemplateDialogOpen(true);
                  },
                  onDeleteTemplate: (template) => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this template?",
                      )
                    ) {
                      deleteTemplateMutation.mutateAsync({ id: template.id! });
                    }
                  },
                  onPreviewTemplate: (template) => {
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.write(template.htmlContent);
                      win.document.close();
                      win.document.title = `Preview: ${template.name}`;
                    }
                  },
                })}
                data={{
                  items: templates || [],
                  total: templates?.length || 0,
                  page: 1,
                  limit: 10,
                }}
                searchKey="name"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit" : "New"} SMTP Configuration
            </DialogTitle>
          </DialogHeader>
          <EmailConfigForm
            initialData={editingConfig || undefined}
            onSuccess={() => {
              setOpen(false);
              setEditingConfig(null);
              router.refresh();
            }}
            onCancel={() => {
              setOpen(false);
              setEditingConfig(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit" : "New"} Email Template
            </DialogTitle>
          </DialogHeader>
          <EmailTemplateForm
            initialData={editingTemplate || undefined}
            onSuccess={() => {
              setIsTemplateDialogOpen(false);
              setEditingTemplate(null);
              router.refresh();
            }}
            onCancel={() => {
              setIsTemplateDialogOpen(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
      </ProtectedRoute>
  );
}
