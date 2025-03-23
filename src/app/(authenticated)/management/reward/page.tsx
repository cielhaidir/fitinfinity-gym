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

export default function RewardPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Partial<Reward>>({
    name: "",
    iconName: "",
    price: 0,
    stock: 0,
  });

  const utils = api.useUtils();
  const { data, isLoading } = api.reward.list.useQuery();
  
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reward?")) {
      deleteReward.mutate({ id });
    }
  };

  const columns = createColumns({
    onEditReward: handleEdit,
    onDeleteReward: (reward) => handleDelete(reward.id),
  });

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Reward Management
          </h2>
          <p className="text-muted-foreground">
            Manage your rewards and redemption items here
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
            <Button className="bg-infinity w-full md:w-auto">
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
      
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={{
            items: data?.items ?? [],
            total: data?.total ?? 0,
            page: data?.page ?? 1,
            limit: data?.limit ?? 10,
          }}
          searchColumns={[
            { id: "name", placeholder: "Search by name..." },
            { id: "iconName", placeholder: "Search by icon..." },
          ]}
          onSearch={(value, column) => {
            // Implement search functionality if needed
            console.log("Search:", value, "Column:", column);
          }}
          onPaginationChange={(page, limit) => {
            // Implement pagination if needed
            console.log("Page:", page, "Limit:", limit);
          }}
        />
      )}
    </div>
  );
} 