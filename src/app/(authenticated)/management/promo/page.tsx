"use client";

import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { z } from "zod";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { DataTable } from "@/components/datatable/data-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const packageOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  isActive: z.boolean().optional(),
});

const bonusPackageOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  day: z.number().nullable().optional(),
  sessions: z.number().nullable().optional(),
});

const promoItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  triggerPackageId: z.string(),
  bonusPackageId: z.string().nullable(),
  bonusStartMode: z.string().nullable().optional(),
  bonusCustomStartDate: z.date().nullable().optional(),
  maxPerMember: z.number().nullable(),
  triggerPackage: packageOptionSchema.nullable().optional(),
  bonusPackage: bonusPackageOptionSchema.nullable().optional(),
  _count: z.object({ redemptions: z.number() }).optional(),
});

const promoListSchema = z.object({
  items: z.array(promoItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const packageListSchema = z.array(packageOptionSchema);

type PromoItem = z.infer<typeof promoItemSchema>;
type PackageOption = z.infer<typeof packageOptionSchema>;

type PromoFormState = {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  triggerPackageId: string;
  bonusPackageId: string;
  bonusStartMode: "IMMEDIATE" | "AFTER_CURRENT" | "CUSTOM_DATE";
  bonusCustomStartDate: string;
  maxPerMember: string;
};

const emptyForm: PromoFormState = {
  name: "",
  description: "",
  isActive: true,
  startDate: "",
  endDate: "",
  triggerPackageId: "",
  bonusPackageId: "",
  bonusStartMode: "AFTER_CURRENT",
  bonusCustomStartDate: "",
  maxPerMember: "",
};

export default function PromoManagementPage() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<PromoFormState>(emptyForm);
  const [redemptionPromoId, setRedemptionPromoId] = useState<string | null>(null);
  const [redemptionPromoName, setRedemptionPromoName] = useState("");

  const promoQuery = api.promo.list.useQuery({ page, limit });
  const promoData = useMemo(() => {
    const parsed = promoListSchema.safeParse(promoQuery.data as unknown);
    if (parsed.success) {
      return parsed.data;
    }
    return { items: [], total: 0, page, limit };
  }, [promoQuery.data, page, limit]);

  const packageQuery = api.package.listAlll.useQuery(undefined, {
    enabled: true,
  });
  const packageOptions = useMemo<PackageOption[]>(() => {
    const parsed = packageListSchema.safeParse(packageQuery.data as unknown);
    if (parsed.success) {
      return parsed.data.filter((pkg) => pkg.isActive !== false);
    }
    return [];
  }, [packageQuery.data]);

  const createPromo = api.promo.create.useMutation({
    onSuccess: async () => {
      await utils.promo.list.invalidate();
      toast.success("Promo campaign berhasil dibuat");
      setIsDialogOpen(false);
      setForm(emptyForm);
      setIsEditMode(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePromo = api.promo.update.useMutation({
    onSuccess: async () => {
      await utils.promo.list.invalidate();
      toast.success("Promo campaign berhasil diupdate");
      setIsDialogOpen(false);
      setForm(emptyForm);
      setIsEditMode(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePromo = api.promo.delete.useMutation({
    onSuccess: async () => {
      await utils.promo.list.invalidate();
      toast.success("Promo campaign berhasil dihapus");
    },
    onError: (error) => toast.error(error.message),
  });

  const redemptionsQuery = api.promo.listPromoRedemptions.useQuery(
    { promoId: redemptionPromoId ?? "", limit: 50 },
    { enabled: !!redemptionPromoId },
  );

  const openRedemptionDialog = (promo: PromoItem) => {
    setRedemptionPromoId(promo.id);
    setRedemptionPromoName(promo.name);
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return promoData.items;
    const keyword = search.toLowerCase();
    return promoData.items.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        (item.description ?? "").toLowerCase().includes(keyword) ||
        (item.triggerPackage?.name ?? "").toLowerCase().includes(keyword),
    );
  }, [promoData.items, search]);

  const transformedData = {
    items: filteredItems,
    total: filteredItems.length,
    page,
    limit,
  };

  const openCreateDialog = () => {
    setIsEditMode(false);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: PromoItem) => {
    setIsEditMode(true);
    setForm({
      id: promo.id,
      name: promo.name,
      description: promo.description ?? "",
      isActive: promo.isActive,
      startDate: promo.startDate ? format(new Date(promo.startDate), "yyyy-MM-dd") : "",
      endDate: promo.endDate ? format(new Date(promo.endDate), "yyyy-MM-dd") : "",
      triggerPackageId: promo.triggerPackageId,
      bonusPackageId: promo.bonusPackageId ?? "",
      bonusStartMode: (promo.bonusStartMode as "IMMEDIATE" | "AFTER_CURRENT" | "CUSTOM_DATE") ?? "AFTER_CURRENT",
      bonusCustomStartDate: promo.bonusCustomStartDate ? format(new Date(promo.bonusCustomStartDate), "yyyy-MM-dd") : "",
      maxPerMember: promo.maxPerMember ? String(promo.maxPerMember) : "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.triggerPackageId || !form.bonusPackageId) {
      toast.error("Nama, start date, trigger package, dan bonus package wajib diisi");
      return;
    }

    if (form.bonusStartMode === "CUSTOM_DATE" && !form.bonusCustomStartDate) {
      toast.error("Tanggal mulai bonus wajib diisi jika mode Custom Date");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      isActive: form.isActive,
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : null,
      triggerPackageId: form.triggerPackageId,
      bonusPackageId: form.bonusPackageId,
      bonusStartMode: form.bonusStartMode,
      bonusCustomStartDate: form.bonusCustomStartDate ? new Date(form.bonusCustomStartDate) : null,
      maxPerMember: form.maxPerMember ? Number(form.maxPerMember) : null,
    };

    if (isEditMode && form.id) {
      await updatePromo.mutateAsync({ id: form.id, ...payload });
      return;
    }

    await createPromo.mutateAsync(payload);
  };

  const columns: ColumnDef<PromoItem>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Promo" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.description ?? "-"}</p>
        </div>
      ),
    },
    {
      accessorKey: "triggerPackage.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trigger Package" />,
      cell: ({ row }) => row.original.triggerPackage?.name ?? "-",
    },
    {
      accessorKey: "bonusPackage.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bonus Package" />,
      cell: ({ row }) => {
        const bp = row.original.bonusPackage;
        if (!bp) return "-";
        const detail = bp.day ? `${bp.day} hari` : bp.sessions ? `${bp.sessions} sesi` : "";
        const startMode = row.original.bonusStartMode;
        const startLabel = startMode === "IMMEDIATE"
          ? "Langsung"
          : startMode === "CUSTOM_DATE"
          ? `Custom: ${row.original.bonusCustomStartDate ? format(new Date(row.original.bonusCustomStartDate), "dd MMM yyyy") : "-"}`
          : "Setelah subs selesai";
        return (
          <div>
            <p className="font-medium">{bp.name}</p>
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            <p className="text-xs text-muted-foreground">Mulai: {startLabel}</p>
          </div>
        );
      },
    },
    {
      id: "redemptions",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Redeemed" />,
      cell: ({ row }) => {
        const count = row.original._count?.redemptions ?? 0;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => openRedemptionDialog(row.original)}
          >
            <Badge variant="outline">{count}x</Badge>
            <Eye className="h-3 w-3 text-muted-foreground" />
          </Button>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Periode" />,
      cell: ({ row }) => {
        const startDate = row.original.startDate
          ? format(new Date(row.original.startDate), "dd MMM yyyy")
          : "-";
        const endDate = row.original.endDate
          ? format(new Date(row.original.endDate), "dd MMM yyyy")
          : "No end";
        return `${startDate} - ${endDate}`;
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deletePromo.mutate({ id: row.original.id })}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute requiredPermissions={["menu:voucher"]}>
      <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Promo Campaign Management</h2>
            <p className="text-muted-foreground">Kelola promo bonus package berdasarkan pembelian package trigger</p>
          </div>
          <Button className="w-full bg-infinity md:w-auto" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Promo
          </Button>
        </div>

        <div className="mb-4 max-w-sm">
          <Input
            placeholder="Cari promo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable
          data={transformedData}
          columns={columns}
          isLoading={promoQuery.isLoading}
          onPaginationChange={(newPage, newLimit) => {
            setPage(newPage);
            setLimit(newLimit);
          }}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Promo" : "Tambah Promo"}</DialogTitle>
            <DialogDescription>
              Promo akan otomatis diproses saat payment subscription sukses.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Promo</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Trigger Package</Label>
              <Select
                value={form.triggerPackageId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, triggerPackageId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih package trigger" />
                </SelectTrigger>
                <SelectContent>
                  {packageOptions.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Bonus Package</Label>
              <Select
                value={form.bonusPackageId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, bonusPackageId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bonus package yang diberikan gratis" />
                </SelectTrigger>
                <SelectContent>
                  {packageOptions.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Kapan Bonus Mulai</Label>
                <Select
                  value={form.bonusStartMode}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      bonusStartMode: value as "IMMEDIATE" | "AFTER_CURRENT" | "CUSTOM_DATE",
                      bonusCustomStartDate: value !== "CUSTOM_DATE" ? "" : prev.bonusCustomStartDate,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AFTER_CURRENT">
                      Setelah subs aktif selesai
                    </SelectItem>
                    <SelectItem value="IMMEDIATE">
                      Langsung aktif
                    </SelectItem>
                    <SelectItem value="CUSTOM_DATE">
                      Tanggal tertentu
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.bonusStartMode === "AFTER_CURRENT"
                    ? "Bonus mulai setelah subscription sejenis yang aktif berakhir"
                    : form.bonusStartMode === "CUSTOM_DATE"
                    ? "Bonus mulai pada tanggal yang ditentukan"
                    : "Bonus langsung aktif saat payment berhasil"}
                </p>
              </div>
              {form.bonusStartMode === "CUSTOM_DATE" ? (
                <div className="grid gap-2">
                  <Label htmlFor="bonusCustomStartDate">Tanggal Mulai Bonus</Label>
                  <Input
                    id="bonusCustomStartDate"
                    type="date"
                    value={form.bonusCustomStartDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bonusCustomStartDate: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus subscription akan mulai aktif pada tanggal ini
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="maxPerMember">Maks. Redeem / Member</Label>
                  <Input
                    id="maxPerMember"
                    type="number"
                    min={1}
                    placeholder="Kosong = unlimited"
                    value={form.maxPerMember}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, maxPerMember: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Berapa kali 1 member boleh dapat promo ini
                  </p>
                </div>
              )}
            </div>

            {form.bonusStartMode === "CUSTOM_DATE" && (
              <div className="grid gap-2">
                <Label htmlFor="maxPerMember2">Maks. Redeem / Member</Label>
                <Input
                  id="maxPerMember2"
                  type="number"
                  min={1}
                  placeholder="Kosong = unlimited"
                  value={form.maxPerMember}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxPerMember: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Berapa kali 1 member boleh dapat promo ini
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              <Label htmlFor="isActive">Promo aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={createPromo.isPending || updatePromo.isPending}
            >
              {isEditMode ? "Update Promo" : "Simpan Promo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!redemptionPromoId} onOpenChange={(open) => { if (!open) setRedemptionPromoId(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Penerima Promo</DialogTitle>
            <DialogDescription>
              Member yang mendapat promo &quot;{redemptionPromoName}&quot;
              {redemptionsQuery.data?.total ? ` (${redemptionsQuery.data.total} total)` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[450px] overflow-y-auto space-y-2">
            {redemptionsQuery.isLoading && (
              <p className="py-4 text-center text-muted-foreground">Memuat data...</p>
            )}
            {redemptionsQuery.data?.items.length === 0 && !redemptionsQuery.isLoading && (
              <p className="py-4 text-center text-muted-foreground">Belum ada member yang mendapat promo ini.</p>
            )}
            {redemptionsQuery.data?.items.map((r) => {
              const item = r as unknown as {
                id: string;
                grantedAt: string | null;
                note?: string | null;
                member?: { user?: { name?: string; email?: string } };
                triggerSubscription?: {
                  id?: string;
                  startDate?: string;
                  endDate?: string;
                  isActive?: boolean;
                  deletedAt?: string | null;
                  package?: { name?: string };
                };
                bonusSubscription?: {
                  id?: string;
                  startDate?: string;
                  endDate?: string;
                  isActive?: boolean;
                  isFrozen?: boolean;
                  deletedAt?: string | null;
                  package?: { name?: string };
                };
              };

              const bonusStatus = item.bonusSubscription?.deletedAt
                ? "Deleted"
                : item.bonusSubscription?.isFrozen
                ? "Frozen"
                : item.bonusSubscription?.isActive
                ? "Active"
                : "Inactive";

              const bonusStatusColor = item.bonusSubscription?.deletedAt
                ? "text-red-500"
                : item.bonusSubscription?.isFrozen
                ? "text-blue-400"
                : item.bonusSubscription?.isActive
                ? "text-green-500"
                : "text-yellow-500";

              return (
                <div key={item.id} className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{item.member?.user?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{item.member?.user?.email ?? "-"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {item.grantedAt ? format(new Date(item.grantedAt), "dd MMM yyyy HH:mm") : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Trigger</p>
                      <p className="font-medium">{item.triggerSubscription?.package?.name ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bonus</p>
                      <p className="font-medium">{item.bonusSubscription?.package?.name ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Periode Bonus</p>
                      <p>
                        {item.bonusSubscription?.startDate
                          ? format(new Date(item.bonusSubscription.startDate), "dd MMM yyyy")
                          : "-"}
                        {" - "}
                        {item.bonusSubscription?.endDate
                          ? format(new Date(item.bonusSubscription.endDate), "dd MMM yyyy")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status Bonus</p>
                      <p className={`font-medium ${bonusStatusColor}`}>{bonusStatus}</p>
                    </div>
                  </div>
                  {item.note && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{item.note}</p>
                  )}
                </div>
              );
            })}
            {(redemptionsQuery.data?.total ?? 0) > 50 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Menampilkan 50 dari {redemptionsQuery.data?.total} redemption
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRedemptionPromoId(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
