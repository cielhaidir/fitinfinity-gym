"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type Voucher } from "./schema";
import { VoucherForm } from "./voucher-form";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function VoucherPage() {
  const utils = api.useUtils();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [newVoucher, setNewVoucher] = useState<Partial<Voucher>>({
    name: "",
    maxClaim: 1,
    type: "GENERAL",
    discountType: "CASH",
    amount: 0,
    minimumPurchase: 0,
    allowStack: false,
    isActive: true,
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive" | "all">("active");

  const { data: vouchers = [], isLoading } =
    api.voucher.getAll.useQuery();

  const filteredVouchers = useMemo(() => {
    if (!Array.isArray(vouchers)) return [];
    if (activeFilter === "active") return vouchers.filter((v) => v.isActive);
    if (activeFilter === "inactive") return vouchers.filter((v) => !v.isActive);
    return vouchers;
  }, [vouchers, activeFilter]);

  // Transform the data to match the expected format
  const transformedData = {
    items: filteredVouchers,
    total: filteredVouchers.length,
    page,
    limit,
  };

  const createVoucherMutation = api.voucher.create.useMutation({
    onSuccess: () => {
      void utils.voucher.getAll.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedVoucher(null);
      setNewVoucher({
        name: "",
        maxClaim: 1,
        type: "GENERAL",
        discountType: "CASH",
        amount: 0,
        minimumPurchase: 0,
        allowStack: false,
        isActive: true,
      });
    },
  });

  const updateVoucherMutation = api.voucher.update.useMutation({
    onSuccess: () => {
      void utils.voucher.getAll.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedVoucher(null);
    },
  });

  const deleteVoucherMutation = api.voucher.delete.useMutation({
    onSuccess: () => {
      void utils.voucher.getAll.invalidate();
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    // Handle number inputs
    if (type === "number") {
      processedValue = value === "" ? "0" : value;
    }

    if (isEditMode && selectedVoucher) {
      setSelectedVoucher((prev) => ({
        ...prev!,
        [name]: type === "number" ? Number(processedValue) : processedValue,
      }));
    } else {
      setNewVoucher((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(processedValue) : processedValue,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string | boolean) => {
    const booleanFields = ["allowStack", "isActive"];
    const coerced = booleanFields.includes(name)
      ? (typeof value === "boolean" ? value : value === "true")
      : value;
    if (isEditMode && selectedVoucher) {
      setSelectedVoucher((prev) => ({ ...prev!, [name]: coerced }));
    } else {
      setNewVoucher((prev) => ({ ...prev, [name]: coerced }));
    }
  };

  const handleCreateOrUpdateVoucher = async () => {
    try {
      const currentVoucher = isEditMode ? selectedVoucher : newVoucher;
      if (currentVoucher?.type === "REFERRAL" && !currentVoucher?.referralCode?.trim()) {
        toast.error("Kode referral harus diisi untuk voucher tipe REFERRAL");
        return;
      }

      let operation;

      if (isEditMode && selectedVoucher) {
        operation = updateVoucherMutation.mutateAsync({
          id: selectedVoucher.id,
          name: selectedVoucher.name,
          maxClaim: Number(selectedVoucher.maxClaim),
          type: selectedVoucher.type,
          discountType: selectedVoucher.discountType as "PERCENT" | "CASH",
          referralCode: selectedVoucher.referralCode ?? undefined,
          amount: Number(selectedVoucher.amount),
          minimumPurchase: Number(selectedVoucher.minimumPurchase) || undefined,
          allowStack: selectedVoucher.allowStack === true || (selectedVoucher.allowStack as any) === "true",
          isActive: selectedVoucher.isActive === true || (selectedVoucher.isActive as any) === "true",
          expiryDate: selectedVoucher.expiryDate ?? undefined,
        });
      } else {
        operation = createVoucherMutation.mutateAsync({
          name: newVoucher.name!,
          maxClaim: Number(newVoucher.maxClaim),
          type: newVoucher.type!,
          discountType: newVoucher.discountType!,
          referralCode: newVoucher.referralCode ?? undefined,
          amount: Number(newVoucher.amount),
          minimumPurchase: Number(newVoucher.minimumPurchase) || undefined,
          allowStack: newVoucher.allowStack ?? false,
          expiryDate: newVoucher.expiryDate ?? undefined,
        });
      }

      toast.promise(operation, {
        loading: "Loading...",
        success: `Voucher has been ${isEditMode ? "updated" : "created"} successfully!`,
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });

      await operation;
    } catch (error) {
      console.error("Error:", error);
      // Don't show toast here since toast.promise will handle errors
    }
  };

  const handleEditVoucher = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDeleteVoucher = async (voucher: Voucher) => {
    const promise = deleteVoucherMutation.mutateAsync({ id: voucher.id });

    toast.promise(promise, {
      loading: "Deleting voucher...",
      success: "Voucher deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
    await promise;
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditVoucher: handleEditVoucher,
    onDeleteVoucher: handleDeleteVoucher,
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:voucher"]}>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedVoucher(null);
          }
        }}
      >
        <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                Voucher Management
              </h2>
              <p className="text-muted-foreground">
                Manage your vouchers and promotional codes here
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setActiveFilter("active")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeFilter === "active"
                      ? "bg-green-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setActiveFilter("inactive")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-x border-border ${
                    activeFilter === "inactive"
                      ? "bg-red-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Tidak Aktif
                </button>
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Semua
                </button>
              </div>
              <SheetTrigger asChild>
                <Button className="w-full bg-infinity md:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add Voucher
                </Button>
              </SheetTrigger>
            </div>
          </div>
          <div className="rounded-md">
            <DataTable
              data={transformedData}
              columns={columns}
              isLoading={isLoading}
              onPaginationChange={handlePaginationChange}
              searchColumns={[
                { id: "name", placeholder: "Search by name..." },
                { id: "type", placeholder: "Search by type..." },
              ]}
              onSearch={(value, column) => {
                setSearch(value);
                setSearchColumn(column);
                setPage(1); // Reset to first page when searching
              }}
            />
          </div>
        </div>
        <VoucherForm
          voucher={selectedVoucher || newVoucher}
          onCreateOrUpdateVoucher={handleCreateOrUpdateVoucher}
          onInputChange={handleInputChange}
          onSelectChange={handleSelectChange}
          isEditMode={isEditMode}
        />
      </Sheet>
    </ProtectedRoute>
  );
}
