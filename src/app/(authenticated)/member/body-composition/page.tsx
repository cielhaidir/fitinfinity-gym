"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { ArrowLeft, Calendar, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { AIBodyCompositionForm } from "@/app/_components/AIBodyCompositionForm";

export default function BodyCompositionPage() {
  const router = useRouter();
  
  // Fetch member's tracking history
  const { data: trackingHistory, isLoading: isHistoryLoading } = api.tracking.getHistory.useQuery({
    page: 1,
    limit: 5,
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracking Komposisi Tubuh</h1>
          <p className="text-muted-foreground">
            Unggah foto hasil scan komposisi tubuh untuk melacak perkembangan Anda
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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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

        <div className="lg:col-span-1">
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
  );
}