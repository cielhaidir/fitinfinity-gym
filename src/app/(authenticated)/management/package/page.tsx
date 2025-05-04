"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { Package } from "./schema";
import { PackageForm } from "./package-form";
import { toast } from "sonner"
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
    });

    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");

    const { data: packageData = { items: [], total: 0, page: 1, limit: 10 } } = api.package.list.useQuery({
        page: 1,
        limit: 10,
        search
    });

    const createPackageMutation = api.package.create.useMutation();
    const updatePackageMutation = api.package.update.useMutation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        // Convert numeric fields to numbers
        let updatedValue: string | number | null = value;
        if (name === 'day' || name === 'sessions' || name === 'price' || name === 'point') {
            updatedValue = value === '' ? null : Number(value);
        }

        if (isEditMode && selectedPackage) {
            setSelectedPackage(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    [name]: updatedValue,
                };
            });
        } else {
            setNewPackage(prev => ({
                ...prev,
                [name]: updatedValue,
            }));
        }
    };

    const handleOrCreatePackage = async () => {
        const messageLoading = isEditMode ? "Updating package..." : "Creating package...";
        const message = isEditMode ? "Package updated successfully!" : "Package created successfully!";
        const promise = async () => {
            const packageData = isEditMode ? selectedPackage : newPackage;
            if (!packageData) return;

            const commonData = {
                name: packageData.name,
                description: packageData.description ?? '',
                price: packageData.price === null ? null : Number(packageData.price),
                point: packageData.point === null ? 0 : Number(packageData.point),
                type: packageData.type,
                isActive: packageData.isActive,
                sessions: packageData.type === 'PERSONAL_TRAINER' ? 
                    (packageData.sessions === null ? null : Number(packageData.sessions)) : null,
                day: packageData.type === 'GYM_MEMBERSHIP' ?
                    (packageData.day === null ? null : Number(packageData.day)) : null,
            };
            if (isEditMode && selectedPackage?.id) {
                await updatePackageMutation.mutateAsync({
                    id: selectedPackage.id,
                    name: packageData.name,
                    description: packageData.description ?? '',
                    price: packageData.price,
                    point: packageData.point === null ? 0 : packageData.point,
                    type: packageData.type,
                    isActive: packageData.isActive,
                    sessions: packageData.type === 'PERSONAL_TRAINER' ? packageData.sessions : null,
                    day: packageData.type === 'GYM_MEMBERSHIP' ? packageData.day : null
                });
            } else {
                await createPackageMutation.mutateAsync({
                    ...commonData,
                    price: packageData.price === null ? 0 : packageData.price // Ensure price is never null
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
            error: (error) => error instanceof Error ? error.message : String(error),
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

        const promise = deletePackageMutation.mutateAsync({ id: packages.id ?? "" });

        toast.promise(promise, {
            loading: 'Deleting package...',
            success: 'Package deleted successfully!',
            error: (error) => error instanceof Error ? error.message : String(error),
        });

        await promise;
        await utils.package.list.invalidate();
    };

    const handlePaginationChange = (page: number, limit: number) => {
        utils.package.list.invalidate({ page, limit });
    };

    const columns = createColumns({ onEditModel: handleEditPackage, onDeleteModel: handlePackageDelete })

    return (
        <>
            <Sheet open={isSheetOpen} onOpenChange={(open) => {
                setIsSheetOpen(open);
                if (!open) {
                    setIsEditMode(false);
                    setSelectedPackage(null);
                }
            }}>
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
                        searchColumns={[
                            { id: "name", placeholder: "Search by name..." },
                        ]}
                        onSearch={(value, column) => {
                            setSearch(value);
                            setSearchColumn(column);
                        }}
                    />
                </div>
            </Sheet>
        </>
    );
}
