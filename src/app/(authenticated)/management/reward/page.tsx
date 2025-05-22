"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { RewardForm } from "./reward-form";
import { Reward } from "./schema";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { RewardDialog } from "./reward-dialog";
import { Loader2 } from "lucide-react";

export default function RewardPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Partial<Reward>>({
    name: "",
    iconName: "",
    price: 0,
    stock: 0,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = api.useUtils();
  const { data, isLoading, error } = api.reward.list.useQuery(undefined, {
    staleTime: 5000,
    refetchOnWindowFocus: false
  });
  
  const createReward = api.reward.create.useMutation({
    onSuccess: () => {
      utils.reward.list.invalidate();
      setIsSheetOpen(false);
      resetForm();
      toast.success("Reward created successfully");
    },
  });

  const updateReward = api.reward.update.useMutation({
    onSuccess: () => {
      utils.reward.list.invalidate();
      setIsSheetOpen(false);
      resetForm();
      toast.success("Reward updated successfully");
    },
  });

  const deleteReward = api.reward.delete.useMutation({
    onSuccess: () => {
      utils.reward.list.invalidate();
      toast.success("Reward deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete reward");
    }
  });

  const resetForm = () => {
    setSelectedReward({
      name: "",
      iconName: "",
      price: 0,
      stock: 0,
    });
    setIsEditMode(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSelectedReward(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setSelectedReward(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateOrUpdateReward = () => {
    if (isEditMode && selectedReward.id) {
      updateReward.mutate(selectedReward as Reward);
    } else {
      const { id, ...createData } = selectedReward;
      createReward.mutate(createData as Omit<Reward, "id" | "createdAt" | "updatedAt">);
    }
  };

  const handleEdit = (reward: Reward) => {
    setSelectedReward(reward);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDelete = (reward: Reward) => {
    if (confirm("Are you sure you want to delete this reward?")) {
      deleteReward.mutate(
        { id: reward.id },
        {
          onError: (error) => {
            toast.error(error.message || "Failed to delete reward");
          }
        }
      );
    }
  };

  const handlePaginationChange = (page: number, limit: number) => {
    // Handle pagination if needed
  };

  const handleCreate = () => {
    setSelectedReward({
      name: "",
      iconName: "",
      price: 0,
      stock: 0,
    });
    setIsEditMode(false);
    setIsSheetOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedReward({
      name: "",
      iconName: "",
      price: 0,
      stock: 0,
    });
    setIsSheetOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading rewards: {error.message}
      </div>
    );
  }

  const columns = createColumns({
    onEditReward: handleEdit,
    onDeleteReward: handleDelete,
  });

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Reward Management
          </h2>
          <p className="text-muted-foreground">
            Manage rewards that members can claim with their points
          </p>
        </div>
        <Sheet 
          open={isSheetOpen} 
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button className="bg-infinity w-full md:w-auto" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Reward
            </Button>
          </SheetTrigger>
          <RewardForm
            reward={selectedReward}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onCreateOrUpdateReward={handleCreateOrUpdateReward}
            isEditMode={isEditMode}
          />
        </Sheet>
      </div>
      
      <DataTable
        columns={columns}
        data={data || { items: [], total: 0, page: 1, limit: 10 }}
        onPaginationChange={handlePaginationChange}
      />

      <RewardDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        reward={selectedReward}
      />
    </div>
  );
} 