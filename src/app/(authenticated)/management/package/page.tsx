"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/protected-route";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type Package } from "./schema";
import { PackageForm } from "./package-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function PackagePage() {
  const utils = api.useUtils();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [newPackage, setNewPackage] = useState<Package>({
    name: "",
    description: "",
    price: 0,
    point: 0,
    type: "GYM_MEMBERSHIP",
    sessions: null,
    day: null,
    isActive: true,
    maxUsers: null,
    isGroupPackage: false,
    groupPriceType: null,
  });

  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: packageData = { items: [], total: 0, page: 1, limit: 10 } } =
    api.package.list.useQuery({
      page,
      limit,
      search,
    });

  const createPackageMutation = api.package.create.useMutation();
  const updatePackageMutation = api.package.update.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Convert numeric fields to numbers
    let updatedValue: string | number | boolean | null = value;
    if (
      name === "day" ||
      name === "sessions" ||
      name === "price" ||
      name === "point" ||
      name === "maxUsers"
    ) {
      updatedValue = value === "" ? null : Number(value);
    } else if (name === "isGroupPackage") {
      updatedValue = value === "true";
    }

    if (isEditMode && selectedPackage) {
      setSelectedPackage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [name]: updatedValue,
        };
      });
    } else {
      setNewPackage((prev) => ({
        ...prev,
        [name]: updatedValue,
      }));
    }
  };

  const handleOrCreatePackage = async () => {
    const messageLoading = isEditMode
      ? "Updating package..."
      : "Creating package...";
    const message = isEditMode
      ? "Package updated successfully!"
      : "Package created successfully!";
    const promise = async () => {
      const packageData = isEditMode ? selectedPackage : newPackage;
      if (!packageData) return;

      // Prepare the data based on package type
      const commonData = {
        name: packageData.name,
        description: packageData.description ?? "",
        price: packageData.price === null ? 0 : Number(packageData.price),
        point: packageData.point === null ? 0 : Number(packageData.point),
        type: packageData.type,
        isActive: packageData.isActive,
      };

      // Add type-specific fields
      let typeSpecificData: any = {};
      
      if (packageData.type === "PERSONAL_TRAINER" || packageData.type === "GROUP_TRAINING") {
        typeSpecificData = {
          sessions: Number(packageData.sessions) || 0,
          day: Number(packageData.day) || 0,
        };
      } else {
        typeSpecificData = {
          sessions: null,
          day: Number(packageData.day) || 0,
        };
      }
      
      // Add group-specific fields
      if (packageData.type === "GROUP_TRAINING") {
        typeSpecificData = {
          ...typeSpecificData,
          maxUsers: Number(packageData.maxUsers) || null,
          isGroupPackage: true, // GROUP_TRAINING packages are always group packages
          groupPriceType: packageData.groupPriceType || null,
        };
      } else {
        typeSpecificData = {
          ...typeSpecificData,
          maxUsers: null,
          isGroupPackage: false,
          groupPriceType: null,
        };
      }

      if (isEditMode && selectedPackage?.id) {
        await updatePackageMutation.mutateAsync({
          id: selectedPackage.id,
          ...commonData,
          ...typeSpecificData,
        });
      } else {
        await createPackageMutation.mutateAsync({
          ...commonData,
          ...typeSpecificData,
        });
      }

      await utils.package.list.invalidate();
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedPackage(null);
    };

    toast.promise(promise, {
      loading: messageLoading,
      success: message,
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  };

  const handleEditPackage = (packageData: Package) => {
    console.log("Editing packageData:", packageData);
    setSelectedPackage(packageData);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const deletePackageMutation = api.package.remove.useMutation();

  const handlePackageDelete = async (packages: Package) => {
    console.log("Deleting packages:", packages);

    const promise = deletePackageMutation.mutateAsync({
      id: packages.id ?? "",
    });

    toast.promise(promise, {
      loading: "Deleting package...",
      success: "Package deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.package.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditModel: handleEditPackage,
    onDeleteModel: handlePackageDelete,
  });

  return (
    <ProtectedRoute requiredPermissions={["list:packages"]}>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedPackage(null);
          }
        }}
      >
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Package Management
              </h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of Fit Infinity Packages!
              </p>
            </div>
            <SheetTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Create Package
              </Button>
            </SheetTrigger>
          </div>
          <PackageForm
            newPackage={selectedPackage || newPackage}
            onCreateOrUpdatePackage={handleOrCreatePackage}
            onInputChange={handleInputChange}
            isEditMode={isEditMode}
          />
          <DataTable
            data={packageData}
            columns={columns}
            onPaginationChange={handlePaginationChange}
            searchColumns={[{ id: "name", placeholder: "Search by name..." }]}
            onSearch={(value, column) => {
              setSearch(value);
              setSearchColumn(column);
              setPage(1); // Reset to first page when searching
            }}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      </Sheet>
    </ProtectedRoute>
  );
}
