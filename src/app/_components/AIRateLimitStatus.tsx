"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { AlertCircle, CheckCircle, Clock, Settings, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const AIRequestTypeLabels = {
  BODY_COMPOSITION: "Body Composition Analysis",
  CALORIE_CALCULATOR: "Calorie Calculator",
  GENERAL: "General AI Assistant",
};

export function AIRateLimitStatus() {
  const [isEditing, setIsEditing] = useState(false);
  const [editLimits, setEditLimits] = useState<{
    requestType: string;
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
  } | null>(null);

  // Get user's rate limit status
  const { 
    data: rateLimitStatus, 
    isLoading: isStatusLoading,
    refetch: refetchStatus 
  } = api.aiRateLimit.getMyStatus.useQuery();

  // Get user's request history
  const { 
    data: requestHistory, 
    isLoading: isHistoryLoading 
  } = api.aiRateLimit.getMyRequestHistory.useQuery({
    limit: 10,
  });

  // Update limits mutation
  const updateLimitsMutation = api.aiRateLimit.updateMyLimits.useMutation({
    onSuccess: () => {
      toast.success("Limits updated successfully");
      setIsEditing(false);
      setEditLimits(null);
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update limits");
    },
  });

  const handleUpdateLimits = () => {
    if (!editLimits) return;

    updateLimitsMutation.mutate({
      requestType: editLimits.requestType as any,
      dailyLimit: editLimits.dailyLimit,
      weeklyLimit: editLimits.weeklyLimit,
      monthlyLimit: editLimits.monthlyLimit,
    });
  };

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusBadge = (canMakeRequest: boolean, reason?: string) => {
    if (canMakeRequest) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Available</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Limited</Badge>;
  };

  if (isStatusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AI Request Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rateLimitStatus || rateLimitStatus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Request Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No rate limit information available.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AI Request Limits
          </CardTitle>
          <CardDescription>
            Manage your AI request limits to control usage across different features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status">Current Status</TabsTrigger>
              <TabsTrigger value="history">Request History</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              {rateLimitStatus.map((status) => (
                <Card key={status.requestType}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {AIRequestTypeLabels[status.requestType as keyof typeof AIRequestTypeLabels]}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status.canMakeRequest, status.reason)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditLimits({
                              requestType: status.requestType,
                              dailyLimit: status.limits.dailyLimit,
                              weeklyLimit: status.limits.weeklyLimit,
                              monthlyLimit: status.limits.monthlyLimit,
                            });
                            setIsEditing(true);
                          }}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    {status.reason && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{status.reason}</AlertDescription>
                      </Alert>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Daily Usage */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Daily ({status.usage.daily}/{status.limits.dailyLimit})</span>
                          <span>{getUsagePercentage(status.usage.daily, status.limits.dailyLimit).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(status.usage.daily, status.limits.dailyLimit)}
                          className="h-2"
                        />
                      </div>

                      {/* Weekly Usage */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Weekly ({status.usage.weekly}/{status.limits.weeklyLimit})</span>
                          <span>{getUsagePercentage(status.usage.weekly, status.limits.weeklyLimit).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(status.usage.weekly, status.limits.weeklyLimit)}
                          className="h-2"
                        />
                      </div>

                      {/* Monthly Usage */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Monthly ({status.usage.monthly}/{status.limits.monthlyLimit})</span>
                          <span>{getUsagePercentage(status.usage.monthly, status.limits.monthlyLimit).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(status.usage.monthly, status.limits.monthlyLimit)}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {isHistoryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : requestHistory && requestHistory.logs.length > 0 ? (
                <div className="space-y-2">
                  {requestHistory.logs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div>
                              <div className="font-medium">
                                {AIRequestTypeLabels[log.requestType as keyof typeof AIRequestTypeLabels]}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {log.endpoint}
                                {log.processingTime && ` • ${log.processingTime}ms`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {log.errorMessage && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription className="text-xs">
                              {log.errorMessage}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    No request history available yet.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Limits Dialog */}
      {isEditing && editLimits && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Rate Limits</CardTitle>
            <CardDescription>
              You can only reduce your limits below the default values. Increases require admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="dailyLimit">Daily Limit</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  min="0"
                  max="100"
                  value={editLimits.dailyLimit}
                  onChange={(e) => setEditLimits({
                    ...editLimits,
                    dailyLimit: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="weeklyLimit">Weekly Limit</Label>
                <Input
                  id="weeklyLimit"
                  type="number"
                  min="0"
                  max="500"
                  value={editLimits.weeklyLimit}
                  onChange={(e) => setEditLimits({
                    ...editLimits,
                    weeklyLimit: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="monthlyLimit">Monthly Limit</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  min="0"
                  max="1000"
                  value={editLimits.monthlyLimit}
                  onChange={(e) => setEditLimits({
                    ...editLimits,
                    monthlyLimit: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdateLimits}
                disabled={updateLimitsMutation.isPending}
              >
                {updateLimitsMutation.isPending ? "Updating..." : "Update Limits"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setEditLimits(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}