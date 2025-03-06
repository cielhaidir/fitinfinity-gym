"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { Subscription, Create } from "./schema";
import { toast } from "sonner"
import { Plus } from "lucide-react";

export default function PackagePage() {
    const utils = api.useUtils();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSubs, setselectedSubs] = useState<Subscription | null>(null);

    const [newSubs, setnewSubs] = useState<Create>({
        memberId: "",
        startDate: new Date(),
        endDate: new Date(),
        packageId: "",
        paymentMethod: "",
        tax: 0,
        totalPayment: 0,
    });

    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");

    const { data: packageData = { items: [], total: 0, page: 1, limit: 10 } } = api.subs.list.useQuery({
        page: 1,
        limit: 10,
        search
    });

    const createPackageMutation = api.package.create.useMutation();
    const updatePackageMutation = api.package.update.useMutation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedValue = name === 'day' ? parseInt(value, 10) : value;

        if (isEditMode && selectedSubs) {
            setselectedSubs(prev => {
              if (!prev) return null;
              return {
                ...prev,
                [name]: updatedValue,
              };
            });
          } else {
            setnewSubs(prev => ({
                ...prev,
                [name]: updatedValue,
            }));
          }
          console.log(selectedSubs)
    };

    const handleOrCreateSubs = async () => {

        const messageLoading = isEditMode ? "Updating subscription..." : "Creating subscription...";
        const message = isEditMode ? "Subscription updated successfully!" : "Subscription created successfully!";
        const promise = async () => {

            if (isEditMode && selectedSubs) {
                console.log('updated package:', selectedSubs);
                await updatePackageMutation.mutateAsync({
                    id: selectedSubs.id ?? "",
                    name: newSubs.name,
                    description: newSubs.description ?? '',
                    price: newSubs.price,
                    type: newSubs.type,
                    sessions: typeof newSubs.sessions === 'number' ? newSubs.sessions : undefined,
                    day: typeof newSubs.day === 'number' ? newSubs.day : undefined,
                });

                await utils.package.list.invalidate();
                setIsSheetOpen(false);
                setIsEditMode(false);
                setselectedSubs(null);

            } else {

                const packageSub = await createPackageMutation.mutateAsync({
                    name: newSubs.name,
                    description: newSubs.description ?? '',
                    price: Number(newSubs.price),
                    type: newSubs.type,
                    sessions: typeof newSubs.sessions === 'number' ? newSubs.sessions : undefined,
                    day: typeof newSubs.day === 'number' ? newSubs.day : undefined,
                });


                await utils.package.list.invalidate();

                setnewSubs({
                    name: "",
                    description: "",
                    price: 0,
                    type: "GYM_MEMBERSHIP",
                    sessions: null,
                    day: null,
                });

                setIsSheetOpen(false);
            }
        }
        toast.promise(promise, {
            loading: messageLoading,
            success: message,
            error: (error) => error instanceof Error ? error.message : String(error),
        });
    };

    const handleEditPackage = (packageData: Package) => {
        console.log("Editing packageData:", packageData);
        setselectedSubs(packageData);
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
                    setselectedSubs(null);
                }
            }}>
                <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
                    <div className="flex items-center justify-between space-y-2">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Subscription Management
                            </h2>
                            <p className="text-muted-foreground">
                                Here&apos;s a list of Fit Infinity Subscriptions!
                            </p>
                        </div>
                        <SheetTrigger asChild>
                            <Button className="mb-4 bg-infinity">
                                <Plus className="mr-2 h-4 w-4" /> Create Subscription
                            </Button>
                        </SheetTrigger>
                    </div>
                    <SubscriptionForm
                        newSubscription={selectedSubs || newSubs}
                        onCreateOrUpdatePackage={handleOrCreateSubs}
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
