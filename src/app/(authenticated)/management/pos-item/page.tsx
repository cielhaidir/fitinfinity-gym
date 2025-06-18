"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type POSItem } from "./schema";
import { ItemForm } from "./item-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function POSItemPage() {
  const utils = api.useUtils();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<POSItem & { category?: { name: string } } | null>(null);

  const [newItem, setNewItem] = useState<POSItem>({
    name: "",
    description: "",
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    categoryId: "",
    isActive: true,
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: itemData = { items: [], total: 0, page: 1, limit: 10 } } =
    api.posItem.list.useQuery({
      page,
      limit,
      search,
    });

  const createItemMutation = api.posItem.create.useMutation();
  const updateItemMutation = api.posItem.update.useMutation();
  const deleteItemMutation = api.posItem.delete.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let updatedValue: string | number = value;

    // Convert numeric fields to numbers
    if (name === "price" || name === "cost" || name === "stock" || name === "minStock") {
      updatedValue = value === "" ? 0 : Number(value);
    }

    if (isEditMode && selectedItem) {
      setSelectedItem((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [name]: updatedValue,
        };
      });
    } else {
      setNewItem((prev) => ({
        ...prev,
        [name]: updatedValue,
      }));
    }
  };

  const handleSelectChange = (value: string) => {
    if (isEditMode && selectedItem) {
      setSelectedItem((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          categoryId: value,
        };
      });
    } else {
      setNewItem((prev) => ({
        ...prev,
        categoryId: value,
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    if (isEditMode && selectedItem) {
      setSelectedItem((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isActive: checked,
        };
      });
    } else {
      setNewItem((prev) => ({
        ...prev,
        isActive: checked,
      }));
    }
  };

  const handleCreateOrUpdateItem = async () => {
    const messageLoading = isEditMode
      ? "Updating item..."
      : "Creating item...";
    const message = isEditMode
      ? "Item updated successfully!"
      : "Item created successfully!";
    
    const promise = async () => {
      const itemData = isEditMode ? selectedItem : newItem;
      if (!itemData) return;

      if (isEditMode && selectedItem?.id) {
        await updateItemMutation.mutateAsync({
          id: selectedItem.id,
          name: itemData.name,
          description: itemData.description,
          price: Number(itemData.price),
          cost: itemData.cost ? Number(itemData.cost) : undefined,
          stock: Number(itemData.stock),
          minStock: itemData.minStock ? Number(itemData.minStock) : undefined,
          categoryId: itemData.categoryId,
          isActive: itemData.isActive,
        });
      } else {
        await createItemMutation.mutateAsync({
          name: itemData.name,
          description: itemData.description,
          price: Number(itemData.price),
          cost: itemData.cost ? Number(itemData.cost) : undefined,
          stock: Number(itemData.stock),
          minStock: itemData.minStock ? Number(itemData.minStock) : undefined,
          categoryId: itemData.categoryId,
          isActive: itemData.isActive,
        });
      }

      await utils.posItem.list.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedItem(null);
      setNewItem({
        name: "",
        description: "",
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 0,
        categoryId: "",
        isActive: true,
      });
    };

    toast.promise(promise, {
      loading: messageLoading,
      success: message,
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  };

  const handleEditItem = (itemData: POSItem & { category?: { name: string } }) => {
    setSelectedItem(itemData);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDeleteItem = async (item: POSItem) => {
    const promise = deleteItemMutation.mutateAsync({
      id: item.id ?? "",
    });

    toast.promise(promise, {
      loading: "Deleting item...",
      success: "Item deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.posItem.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditModel: handleEditItem,
    onDeleteModel: handleDeleteItem,
  });

  return (
    <ProtectedRoute requiredPermissions={["list:pos-item"]}>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedItem(null);
            setNewItem({
              name: "",
              description: "",
              price: 0,
              cost: 0,
              stock: 0,
              minStock: 0,
              categoryId: "",
              isActive: true,
            });
          }
        }}
      >
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                POS Item Management
              </h2>
              <p className="text-muted-foreground">
                Manage items for your point of sale system
              </p>
            </div>
            <SheetTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Create Item
              </Button>
            </SheetTrigger>
          </div>
          <ItemForm
            newItem={selectedItem || newItem}
            onCreateOrUpdateItem={handleCreateOrUpdateItem}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onSwitchChange={handleSwitchChange}
            isEditMode={isEditMode}
          />
          <DataTable
            data={itemData}
            columns={columns}
            onPaginationChange={handlePaginationChange}
            searchColumns={[{ id: "name", placeholder: "Search by name..." }]}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      </Sheet>
    </ProtectedRoute>
  );
}