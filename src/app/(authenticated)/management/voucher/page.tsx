"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { Voucher } from "./schema";
import { VoucherForm } from "./voucher-form";
import { toast } from "sonner";

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
    isActive: true,
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");

  const { data: vouchers = { items: [], total: 0, page: 1, limit: 10 } } = api.voucher.list.useQuery({
    type: undefined,
    isActive: undefined,
  });

  console.log('Vouchers data:', vouchers);

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
        isActive: true,
      });
    }
  });

  const updateVoucherMutation = api.voucher.update.useMutation({
    onSuccess: () => {
      void utils.voucher.list.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedVoucher(null);
    }
  });

  const deleteVoucherMutation = api.voucher.remove.useMutation({
    onSuccess: () => {
      void utils.voucher.list.invalidate();
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    // Handle number inputs
    if (type === 'number') {
      processedValue = value === '' ? '0' : value;
    }

    if (isEditMode && selectedVoucher) {
      setSelectedVoucher(prev => ({
        ...prev!,
        [name]: type === 'number' ? Number(processedValue) : processedValue,
      }));
    } else {
      setNewVoucher(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(processedValue) : processedValue,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (isEditMode && selectedVoucher) {
      setSelectedVoucher(prev => ({
        ...prev!,
        [name]: value,
      }));
    } else {
      setNewVoucher(prev => ({
        ...prev,
        [name]: value,
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
          expiryDate: newVoucher.expiryDate ?? undefined,
        });
      }

      toast.promise(operation, {
        loading: 'Loading...',
        success: `Voucher has been ${isEditMode ? 'updated' : 'created'} successfully!`,
        error: (error) => error instanceof Error ? error.message : String(error),
      });

      await operation;
    } catch (error) {
      console.error('Error:', error);
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
      loading: 'Deleting voucher...',
      success: 'Voucher deleted successfully!',
      error: (error) => error instanceof Error ? error.message : String(error),
    });
    await promise;
  };
  const handlePaginationChange = (page: number, limit: number) => {
    void utils.voucher.list.invalidate();
  };

  const columns = createColumns({
    onEditVoucher: handleEditVoucher,
    onDeleteVoucher: handleDeleteVoucher,
  });

  return (
    <>
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
        <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                Voucher Management
              </h2>
              <p className="text-muted-foreground">
                Manage your vouchers and promotional codes here
              </p>
            </div>
            <SheetTrigger asChild>
              <Button className="bg-infinity w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Voucher
              </Button>
            </SheetTrigger>
          </div>
          <div className="rounded-md">
            <DataTable
              data={{
                items: Array.isArray(vouchers) ? vouchers : [],
                total: Array.isArray(vouchers) ? vouchers.length : 0,
                page: 1,
                limit: 10,
              }}
              columns={columns}
              onPaginationChange={handlePaginationChange}
              searchColumns={[
                { id: "name", placeholder: "Search by name..." },
                { id: "type", placeholder: "Search by type..." },
              ]}
              onSearch={(value, column) => {
                setSearch(value);
                setSearchColumn(column);
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
    </>
  );
}
