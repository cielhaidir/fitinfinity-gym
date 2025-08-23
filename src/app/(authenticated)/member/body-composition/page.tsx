"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { ArrowLeft, Calendar, TrendingUp, Bot, AlertTriangle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AIBodyCompositionForm } from "@/app/_components/AIBodyCompositionForm";
import { AIRequestType } from "@/server/utils/aiRateLimitService";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
export default function BodyCompositionPage() {
  const router = useRouter();
  
  // Fetch member's tracking history
  const { data: trackingHistory, isLoading: isHistoryLoading } = api.tracking.getHistory.useQuery({
    page: 1,
    limit: 5,
  });

  // Check AI rate limit status
  const { data: aiRateLimit } = api.aiRateLimit.canMakeRequest.useQuery({
    requestType: AIRequestType.BODY_COMPOSITION,
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCompositionValue = (data: any, key: string): string | number | undefined => {
    if (typeof data === 'object' && data !== null && data[key] !== undefined) {
      return data[key];
    }
    return undefined;
  };

  return (
    <ProtectedRoute requiredPermissions={["member:body-composition"]}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tracking Komposisi Tubuh</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Unggah foto hasil scan komposisi tubuh untuk melacak perkembangan Anda
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* AI Rate Limit Status */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {aiRateLimit?.allowed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">AI Available</span>
                    <span className="sm:hidden">AI OK</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">AI Limited</span>
                    <span className="sm:hidden">AI Limited</span>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/member/ai-limits")}
                  className="flex items-center gap-1"
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage</span>
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/member")}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali ke Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rekam</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trackingHistory?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Rekam komposisi tubuh
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tracking Terbaru</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trackingHistory?.items?.[0] ? formatDate(trackingHistory.items[0].createdAt) : "Tidak ada data"}
              </div>
              <p className="text-xs text-muted-foreground">
                Pengukuran terakhir dicatat
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Rate Limit Warning */}
        {aiRateLimit && !aiRateLimit.allowed && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-1">AI Analysis Temporarily Limited</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {aiRateLimit.reason || "You have reached your AI request limit for body composition analysis."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/member/ai-limits")}
                    >
                      View AI Limits
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Status
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle>Analisis Komposisi Tubuh bertenaga AI</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Unggah foto skala komposisi tubuh Anda untuk analisis AI instan dengan rekomendasi nutrisi, fitness, dan gaya hidup yang dipersonalisasi
                </p>
              </CardHeader>
              <CardContent>
                {typeof window !== 'undefined' && <AIBodyCompositionForm />}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Terbaru</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pengukuran terbaru Anda
                </p>
              </CardHeader>
              <CardContent>
                {isHistoryLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                ) : trackingHistory && trackingHistory.items && trackingHistory.items.length > 0 ? (
                  <div className="space-y-3">
                    {trackingHistory.items.slice(0, 3).map((record) => (
                      <div
                        key={record.id}
                        className="space-y-2 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => router.push(`/member/body-composition/history?detail=${record.id}`)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            {formatDate(record.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getCompositionValue(record.composition, 'bmi') && (
                            <div>BMI: {getCompositionValue(record.composition, 'bmi')}</div>
                          )}
                          {getCompositionValue(record.composition, 'bodyFat') && (
                            <div>Lemak Tubuh: {getCompositionValue(record.composition, 'bodyFat')}%</div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {trackingHistory && trackingHistory.total > 3 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push("/member/body-composition/history")}
                      >
                        Lihat Semua {trackingHistory.total} Rekam
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      Belum ada data komposisi tubuh
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}