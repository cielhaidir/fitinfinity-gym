"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type POSCategory } from "./schema";
import { CategoryForm } from "./category-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function POSCategoryPage() {
  const utils = api.useUtils();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<POSCategory | null>(null);

  const [newCategory, setNewCategory] = useState<POSCategory>({
    name: "",
    description: "",
    isActive: true,
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: categoryData = { items: [], total: 0, page: 1, limit: 10 } } =
    api.posCategory.list.useQuery({
      page,
      limit,
      search,
    });

  const createCategoryMutation = api.posCategory.create.useMutation();
  const updateCategoryMutation = api.posCategory.update.useMutation();
  const deleteCategoryMutation = api.posCategory.delete.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (isEditMode && selectedCategory) {
      setSelectedCategory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [name]: value,
        };
      });
    } else {
      setNewCategory((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    if (isEditMode && selectedCategory) {
      setSelectedCategory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isActive: checked,
        };
      });
    } else {
      setNewCategory((prev) => ({
        ...prev,
        isActive: checked,
      }));
    }
  };

  const handleCreateOrUpdateCategory = async () => {
    const messageLoading = isEditMode
      ? "Updating category..."
      : "Creating category...";
    const message = isEditMode
      ? "Category updated successfully!"
      : "Category created successfully!";
    
    const promise = async () => {
      const categoryData = isEditMode ? selectedCategory : newCategory;
      if (!categoryData) return;

      if (isEditMode && selectedCategory?.id) {
        await updateCategoryMutation.mutateAsync({
          id: selectedCategory.id,
          name: categoryData.name,
          description: categoryData.description,
          isActive: categoryData.isActive,
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: categoryData.name,
          description: categoryData.description,
          isActive: categoryData.isActive,
        });
      }

      await utils.posCategory.list.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedCategory(null);
      setNewCategory({
        name: "",
        description: "",
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

  const handleEditCategory = (categoryData: POSCategory) => {
    setSelectedCategory(categoryData);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDeleteCategory = async (category: POSCategory) => {
    const promise = deleteCategoryMutation.mutateAsync({
      id: category.id ?? "",
    });

    toast.promise(promise, {
      loading: "Deleting category...",
      success: "Category deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.posCategory.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditModel: handleEditCategory,
    onDeleteModel: handleDeleteCategory,
  });

  return (
    <ProtectedRoute requiredPermissions={["list:pos-category"]}>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedCategory(null);
            setNewCategory({
              name: "",
              description: "",
              isActive: true,
            });
          }
        }}
      >
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                POS Category Management
              </h2>
              <p className="text-muted-foreground">
                Manage categories for your POS items
              </p>
            </div>
            <SheetTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Create Category
              </Button>
            </SheetTrigger>
          </div>
          <CategoryForm
            newCategory={selectedCategory || newCategory}
            onCreateOrUpdateCategory={handleCreateOrUpdateCategory}
            onInputChange={handleInputChange}
            onSwitchChange={handleSwitchChange}
            isEditMode={isEditMode}
          />
          <DataTable
            data={categoryData}
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