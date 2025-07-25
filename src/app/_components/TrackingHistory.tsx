"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Weight,
  Zap,
  Heart
} from "lucide-react";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface TrackingHistoryProps {
  onViewDetails?: (trackingId: string) => void;
}

export function TrackingHistory({ onViewDetails }: TrackingHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { 
    data: historyData, 
    isLoading, 
    error,
    refetch 
  } = api.tracking.getHistory.useQuery({
    page: currentPage,
    limit: 10,
  });

  const deleteMutation = api.tracking.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      console.error('Delete error:', error);
    }
  });

  const handleDelete = async (id: string) => {
    if (deleteId === id) {
      await deleteMutation.mutateAsync({ id });
    } else {
      setDeleteId(id);
    }
  };

  const handleView = (id: string) => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };

  const renderMetricCard = (title: string, value: any, icon: React.ReactNode, unit?: string) => {
    if (value === undefined || value === null) return null;
    
    return (
      <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
        <div className="text-blue-600">{icon}</div>
        <div>
          <p className="text-xs text-gray-600">{title}</p>
          <p className="font-semibold text-sm">
            {typeof value === 'number' ? value.toFixed(1) : value}
            {unit && <span className="text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
      </div>
    );
  };

  const renderTrackingCard = (tracking: any) => {
    const composition = tracking.composition as any;
    const obesity = tracking.obesity as any;
    const suggestion = tracking.suggestion as any;
    
    const hasComposition = composition && Object.keys(composition).length > 0;
    const hasObesity = obesity && Object.keys(obesity).length > 0;
    const hasSuggestion = suggestion && Object.keys(suggestion).length > 0;

    return (
      <Card key={tracking.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Analisis Komposisi Tubuh
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <CalendarDays className="h-4 w-4" />
                {formatDistanceToNow(new Date(tracking.createdAt), { 
                  addSuffix: true,
                  locale: localeId 
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleView(tracking.id)}
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                Detail
              </Button>
              <Button
                variant={deleteId === tracking.id ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleDelete(tracking.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                {deleteId === tracking.id ? "Yakin?" : "Hapus"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Key Metrics Summary */}
            {hasComposition && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700">Metrik Utama</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {renderMetricCard("BMI", composition.bmi, <Weight className="h-4 w-4" />)}
                  {renderMetricCard("Lemak Tubuh", composition.bodyFat, <TrendingDown className="h-4 w-4" />, "%")}
                  {renderMetricCard("Massa Otot", composition.muscleMass, <TrendingUp className="h-4 w-4" />, "kg")}
                  {renderMetricCard("BMR", composition.bmr, <Zap className="h-4 w-4" />, "kcal")}
                </div>
              </div>
            )}

            {/* Health Status */}
            {hasObesity && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700">Status Kesehatan</h4>
                <div className="flex gap-2 flex-wrap">
                  {obesity.obesityLevel && (
                    <Badge variant={
                      obesity.obesityLevel === 'normal' ? 'default' :
                      obesity.obesityLevel === 'overweight' ? 'secondary' :
                      obesity.obesityLevel === 'obese' ? 'destructive' : 'outline'
                    }>
                      {obesity.obesityLevel === 'normal' ? 'Normal' :
                       obesity.obesityLevel === 'overweight' ? 'Kelebihan Berat' :
                       obesity.obesityLevel === 'obese' ? 'Obesitas' :
                       obesity.obesityLevel === 'underweight' ? 'Kekurangan Berat' : obesity.obesityLevel}
                    </Badge>
                  )}
                  {obesity.healthRisk && (
                    <Badge variant={
                      obesity.healthRisk === 'low' ? 'default' :
                      obesity.healthRisk === 'moderate' ? 'secondary' :
                      'destructive'
                    }>
                      <Heart className="h-3 w-3 mr-1" />
                      Risiko {obesity.healthRisk === 'low' ? 'Rendah' :
                               obesity.healthRisk === 'moderate' ? 'Sedang' :
                               obesity.healthRisk === 'high' ? 'Tinggi' : 'Sangat Tinggi'}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Quick Recommendations Preview */}
            {hasSuggestion && suggestion.recommendations && Array.isArray(suggestion.recommendations) && suggestion.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700">Rekomendasi Utama</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {suggestion.recommendations[0]}
                  </p>
                  {suggestion.recommendations.length > 1 && (
                    <p className="text-xs text-blue-600 mt-1">
                      +{suggestion.recommendations.length - 1} rekomendasi lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {!hasComposition && !hasObesity && !hasSuggestion && (
              <p className="text-gray-500 text-sm text-center py-4">
                Data tidak tersedia untuk entri ini
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Riwayat Tracking</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Gagal memuat riwayat tracking: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!historyData?.items || historyData.items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Riwayat</h3>
          <p className="text-gray-600 mb-4">
            Anda belum memiliki data tracking komposisi tubuh.
          </p>
          <p className="text-sm text-gray-500">
            Mulai analisis pertama Anda dengan mengunggah foto hasil scan komposisi tubuh.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil((historyData.total || 0) / (historyData.limit || 10));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Tracking</h2>
          <p className="text-gray-600">
            {historyData.total} entri tracking ditemukan
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {historyData.items.map(renderTrackingCard)}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          
          <div className="flex items-center space-x-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Selanjutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}