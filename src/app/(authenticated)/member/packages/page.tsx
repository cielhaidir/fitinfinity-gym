"use client";

import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Users, Calendar, Zap, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WA_NUMBER = "6282190845159";

const typeLabel: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  GYM_MEMBERSHIP: { label: "Gym Membership", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: <Dumbbell className="h-5 w-5" /> },
  PERSONAL_TRAINER: { label: "Personal Trainer", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <Users className="h-5 w-5" /> },
  GROUP_TRAINING: { label: "Group Training", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: <Users className="h-5 w-5" /> },
  CLASS_SESSION: { label: "Class Session", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: <Zap className="h-5 w-5" /> },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function MemberPackagesPage() {
  const { data: session } = useSession();
  const { data: packages, isLoading } = api.package.listAvailable.useQuery();

  const memberName = session?.user?.name ?? "Member";

  const grouped = (packages ?? []).reduce<Record<string, typeof packages>>((acc, pkg) => {
    if (!acc[pkg.type]) acc[pkg.type] = [];
    acc[pkg.type]!.push(pkg);
    return acc;
  }, {});

  const typeOrder = ["GYM_MEMBERSHIP", "PERSONAL_TRAINER", "GROUP_TRAINING", "CLASS_SESSION"];
  const sortedTypes = typeOrder.filter((t) => grouped[t]?.length);

  const handleContactPackage = (packageName: string) => {
    const msg = `Halo, saya ${memberName} ingin berlangganan paket *${packageName}*. Bisa dibantu?`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleContactGeneral = () => {
    const msg = `Halo, saya ${memberName} tertarik dengan paket di Fit Infinity. Bisa dibantu?`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Paket & Harga</h1>
        <p className="mt-1 text-muted-foreground">Pilih paket yang sesuai kebutuhanmu. Hubungi admin untuk pembelian.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : sortedTypes.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Tidak ada paket tersedia saat ini.
        </Card>
      ) : (
        sortedTypes.map((type) => {
          const info = typeLabel[type] ?? { label: type, color: "", icon: null };
          const pkgs = grouped[type] ?? [];
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                {info.icon}
                <h2 className="text-lg font-semibold">{info.label}</h2>
                <Badge variant="outline" className="text-xs">{pkgs.length} paket</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pkgs.map((pkg) => (
                  <Card key={pkg.id} className="overflow-hidden transition-colors hover:border-[#C4F82A]/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-tight">{pkg.name}</CardTitle>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xl font-bold text-[#C4F82A]">{formatPrice(pkg.price)}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.day && (
                          <Badge variant="outline" className={info.color}>
                            <Calendar className="mr-1 h-3 w-3" />{pkg.day} hari
                          </Badge>
                        )}
                        {pkg.sessions && (
                          <Badge variant="outline" className={info.color}>
                            {pkg.sessions} sesi
                          </Badge>
                        )}
                        {pkg.bonusSessions > 0 && (
                          <Badge variant="outline" className="border-green-500/30 text-green-400">
                            +{pkg.bonusSessions} bonus
                          </Badge>
                        )}
                        {pkg.isGroupPackage && pkg.maxUsers && (
                          <Badge variant="outline" className={info.color}>
                            Max {pkg.maxUsers} orang
                          </Badge>
                        )}
                        {pkg.groupPriceType === "PER_PERSON" && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">/ orang</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs"
                        onClick={() => handleContactPackage(pkg.name)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Hubungi Admin
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}


    </div>
  );
}
