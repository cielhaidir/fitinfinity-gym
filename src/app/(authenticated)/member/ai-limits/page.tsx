"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { AIRateLimitStatus } from "@/app/_components/AIRateLimitStatus";

export default function AILimitsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8" />
            AI Request Management
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage your AI request limits across different features
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/member")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            How AI Rate Limits Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">Daily Limits</h4>
              <p className="text-sm text-muted-foreground">
                Reset every day at midnight. Use these for regular daily analysis.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">Weekly Limits</h4>
              <p className="text-sm text-muted-foreground">
                Reset every Sunday. Prevent excessive usage over a week.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">Monthly Limits</h4>
              <p className="text-sm text-muted-foreground">
                Reset on the 1st of each month. Overall usage control.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Tips for Managing Your Limits</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>You can reduce your limits at any time to control usage</li>
              <li>Contact support if you need higher limits for special use cases</li>
              <li>Failed requests don't count towards your limits</li>
              <li>Different AI features have separate limit tracking</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Main AI Rate Limit Status Component */}
      <AIRateLimitStatus />

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle>Available AI Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">📊 Body Composition Analysis</h4>
              <p className="text-sm text-muted-foreground mb-2">
                AI-powered analysis of body composition scale results with personalized recommendations.
              </p>
              <p className="text-xs text-muted-foreground">
                Used in: Body Composition Tracking
              </p>
            </div>
            <div className="p-4 border rounded-lg opacity-50">
              <h4 className="font-semibold mb-2">🥗 Calorie Calculator</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Smart calorie calculation and meal planning assistance.
              </p>
              <p className="text-xs text-muted-foreground">
                Status: Coming Soon
              </p>
            </div>
            <div className="p-4 border rounded-lg opacity-50">
              <h4 className="font-semibold mb-2">🤖 General AI Assistant</h4>
              <p className="text-sm text-muted-foreground mb-2">
                General fitness and health assistance powered by AI.
              </p>
              <p className="text-xs text-muted-foreground">
                Status: Coming Soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}