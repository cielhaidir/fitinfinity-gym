"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns, type FreezePrice } from "./columns";
import { Loader2, Plus } from "lucide-react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FreezePricePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFreezePrice, setSelectedFreezePrice] = useState<FreezePrice | null>(null);
  const [formData, setFormData] = useState({
    freezeDays: "",
    price: "",
  });

  const utils = api.useUtils();

  // Fetch freeze prices
  const { data: freezePrices, isLoading } = api.freezePrice.list.useQuery({
    page: 1,
    limit: 100,
  });

  // Create mutation
  const createMutation = api.freezePrice.create.useMutation({
    onSuccess: () => {
      toast.success("Freeze price created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ freezeDays: "", price: "" });
      utils.freezePrice.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = api.freezePrice.update.useMutation({
    onSuccess: () => {
      toast.success("Freeze price updated successfully");
      setIsEditDialogOpen(false);
      setSelectedFreezePrice(null);
      setFormData({ freezeDays: "", price: "" });
      utils.freezePrice.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = api.freezePrice.delete.useMutation({
    onSuccess: () => {
      toast.success("Freeze price deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedFreezePrice(null);
      utils.freezePrice.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = api.freezePrice.update.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.isActive
          ? "Freeze price activated successfully"
          : "Freeze price deactivated successfully"
      );
      utils.freezePrice.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    const freezeDays = parseInt(formData.freezeDays);
    const price = parseFloat(formData.price);

    if (isNaN(freezeDays) || freezeDays < 1 || freezeDays > 365) {
      toast.error("Freeze days must be between 1 and 365");
      return;
    }

    if (isNaN(price) || price < 0) {
      toast.error("Price must be a positive number");
      return;
    }

    createMutation.mutate({
      freezeDays,
      price,
      isActive: true,
    });
  };

  const handleEdit = (freezePrice: FreezePrice) => {
    setSelectedFreezePrice(freezePrice);
    setFormData({
      freezeDays: freezePrice.freezeDays.toString(),
      price: freezePrice.price.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedFreezePrice) return;

    const freezeDays = parseInt(formData.freezeDays);
    const price = parseFloat(formData.price);

    if (isNaN(freezeDays) || freezeDays < 1 || freezeDays > 365) {
      toast.error("Freeze days must be between 1 and 365");
      return;
    }

    if (isNaN(price) || price < 0) {
      toast.error("Price must be a positive number");
      return;
    }

    updateMutation.mutate({
      id: selectedFreezePrice.id,
      freezeDays,
      price,
    });
  };

  const handleDelete = (freezePrice: FreezePrice) => {
    setSelectedFreezePrice(freezePrice);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedFreezePrice) return;

    deleteMutation.mutate({
      id: selectedFreezePrice.id,
      hardDelete: false, // Soft delete by default
    });
  };

  const handleToggleActive = (freezePrice: FreezePrice) => {
    toggleActiveMutation.mutate({
      id: freezePrice.id,
      isActive: !freezePrice.isActive,
    });
  };

  const handleOpenCreateDialog = () => {
    setFormData({ freezeDays: "", price: "" });
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setFormData({ freezeDays: "", price: "" });
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedFreezePrice(null);
    setFormData({ freezeDays: "", price: "" });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const columns = createColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggleActive: handleToggleActive,
  });

  return (
    <ProtectedRoute requiredPermissions={["list:freeze-price"]}>
      <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Freeze Price Management
            </h2>
            <p className="text-muted-foreground">
              Kelola harga freeze membership untuk berbagai durasi
            </p>
          </div>
          <Button
            onClick={handleOpenCreateDialog}
            className="w-full bg-infinity md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Freeze Price
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={freezePrices || { items: [], total: 0, page: 1, limit: 10 }}
        />

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Freeze Price</DialogTitle>
              <DialogDescription>
                Tambahkan harga freeze membership untuk durasi tertentu
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="freezeDays">Freeze Days</Label>
                <Input
                  id="freezeDays"
                  type="number"
                  placeholder="Enter number of days (1-365)"
                  value={formData.freezeDays}
                  onChange={(e) =>
                    setFormData({ ...formData, freezeDays: e.target.value })
                  }
                  min="1"
                  max="365"
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah hari freeze (1-365)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price (IDR)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter price in Rupiah"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Harga dalam Rupiah (IDR)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseCreateDialog}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-infinity"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Freeze Price</DialogTitle>
              <DialogDescription>
                Update harga freeze membership
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editFreezeDays">Freeze Days</Label>
                <Input
                  id="editFreezeDays"
                  type="number"
                  placeholder="Enter number of days (1-365)"
                  value={formData.freezeDays}
                  onChange={(e) =>
                    setFormData({ ...formData, freezeDays: e.target.value })
                  }
                  min="1"
                  max="365"
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah hari freeze (1-365)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editPrice">Price (IDR)</Label>
                <Input
                  id="editPrice"
                  type="number"
                  placeholder="Enter price in Rupiah"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Harga dalam Rupiah (IDR)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="bg-infinity"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the freeze price for{" "}
                <strong>
                  {selectedFreezePrice?.freezeDays}{" "}
                  {selectedFreezePrice?.freezeDays === 1 ? "day" : "days"}
                </strong>
                . The price entry will be marked as inactive but not permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}