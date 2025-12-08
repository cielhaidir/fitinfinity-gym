"use client";

import { useState } from "react";
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

  const { data: vouchers = { items: [], total: 0, page: 1, limit: 10 }, isLoading } =
    api.voucher.list.useQuery({
      type: undefined,
      isActive: undefined,
    });

  // Transform the data to match the expected format
  const transformedData = {
    items: Array.isArray(vouchers) ? vouchers : [],
    total: Array.isArray(vouchers) ? vouchers.length : 0,
    page,
    limit,
  };

  console.log("Vouchers data:", vouchers);

  const createVoucherMutation = api.voucher.create.useMutation({
    onSuccess: () => {
      void utils.voucher.list.invalidate();
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
      void utils.voucher.list.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedVoucher(null);
    },
  });

  const deleteVoucherMutation = api.voucher.remove.useMutation({
    onSuccess: () => {
      void utils.voucher.list.invalidate();
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

  const handleSelectChange = (name: string, value: string) => {
    if (isEditMode && selectedVoucher) {
      setSelectedVoucher((prev) => ({
        ...prev!,
        [name]: name === "allowStack" ? value === "true" : value,
      }));
    } else {
      setNewVoucher((prev) => ({
        ...prev,
        [name]: name === "allowStack" ? value === "true" : value,
      }));
    }
  };

  const handleCreateOrUpdateVoucher = async () => {
    try {
      let operation;

      if (isEditMode && selectedVoucher) {
        operation = updateVoucherMutation.mutateAsync({
          id: selectedVoucher.id,
          name: selectedVoucher.name,
          maxClaim: Number(selectedVoucher.maxClaim),
          type: selectedVoucher.type,
          discountType: selectedVoucher.discountType,
          referralCode: selectedVoucher.referralCode ?? undefined,
          amount: Number(selectedVoucher.amount),
          minimumPurchase: Number(selectedVoucher.minimumPurchase) || undefined,
          allowStack: selectedVoucher.allowStack,
          isActive: selectedVoucher.isActive,
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
            <SheetTrigger asChild>
              <Button className="w-full bg-infinity md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Voucher
              </Button>
            </SheetTrigger>
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
