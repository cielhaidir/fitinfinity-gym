"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function ConfigIndexPage() {
  const { toast } = useToast();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: configs, refetch } = api.config.getAll.useQuery(undefined, {
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error loading configurations",
        description: error.message,
      });
    },
  });

  const updateMutation = api.config.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Configuration updated",
        description: "The setting has been saved successfully.",
      });
      setEditingKey(null);
      void refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating configuration",
        description: error.message,
      });
    },
  });

  const resetMutation = api.config.resetToDefaults.useMutation({
    onSuccess: () => {
      toast({
        title: "Configurations reset",
        description: "All settings have been reset to their default values.",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error resetting configurations",
        description: error.message,
      });
    },
  });

  const handleEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const handleSave = async () => {
    if (!editingKey) return;
    
    // Find the current config to get its category
    const currentConfig = configs?.find((c) => c.key === editingKey);
    
    await updateMutation.mutate({
      key: editingKey,
      value: editValue,
      category: currentConfig?.category ?? "default",
    });
  };

  const handleReset = async () => {
    if (
      confirm(
        "Are you sure you want to reset all configurations to their default values?",
      )
    ) {
      await resetMutation.mutate();
    }
  };

  // Filter out configs with category "site"
  const filteredConfigs =
    configs?.filter((config) => config.category !== "site") ?? [];

  return (
    <ProtectedRoute requiredPermissions={["menu:configs"]}>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Configuration</CardTitle>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetMutation.isLoading}
              >
                {resetMutation.isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reset to Defaults
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Setting</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config.key}>
                    <TableCell className="font-medium">
                      {config.category ?? "default"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {config.key}
                    </TableCell>
                    <TableCell>
                      {editingKey === config.key ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="max-w-sm"
                        />
                      ) : (
                        config.value
                      )}
                    </TableCell>
                    <TableCell>
                      {editingKey === config.key ? (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSave}
                            disabled={updateMutation.isLoading}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingKey(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config.key, config.value)}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
