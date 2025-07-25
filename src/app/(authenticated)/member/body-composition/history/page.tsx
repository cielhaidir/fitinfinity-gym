"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrackingHistory } from "@/app/_components/TrackingHistory";
import { TrackingDetail } from "@/app/_components/TrackingDetail";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BodyCompositionHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);

  // Check for detail parameter on mount
  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (detailId) {
      setSelectedTrackingId(detailId);
    }
  }, [searchParams]);

  const handleViewDetails = (trackingId: string) => {
    setSelectedTrackingId(trackingId);
    // Update URL with detail parameter
    router.replace(`/member/body-composition/history?detail=${trackingId}`);
  };

  const handleBackToHistory = () => {
    setSelectedTrackingId(null);
    // Remove the detail parameter from URL
    router.replace('/member/body-composition/history');
  };

  const handleBackToMain = () => {
    router.push("/member/body-composition");
  };

  if (selectedTrackingId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <TrackingDetail 
            trackingId={selectedTrackingId} 
            onBack={handleBackToHistory}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Analisis
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Riwayat Komposisi Tubuh
            </h1>
            <p className="text-gray-600">
              Lihat dan kelola semua data tracking komposisi tubuh Anda.
            </p>
          </div>
        </div>
        
        <TrackingHistory onViewDetails={handleViewDetails} />
      </div>
    </div>
  );
}