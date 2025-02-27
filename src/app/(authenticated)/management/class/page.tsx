"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { classColumns } from "./columns";
import { api } from "@/trpc/react";
import { Class } from "./schema";
import { ClassForm } from "./class-form";
import { toast } from "sonner";

export default function ClassPage() {
    const utils = api.useUtils();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [newClass, setNewClass] = useState<Class>({
        name: "",
        limit: 0,
        price: 0,
        id_employee: "",
    });
    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");

    const { data: classes = { items: [], total: 0, page: 1, limit: 10 } } = api.class.list.useQuery({
        page: 1,
        limit: 10,
        search,
        searchColumn
    });

    const createClassMutation = api.class.create.useMutation();
    const updateClassMutation = api.class.update.useMutation();
    const deleteClassMutation = api.class.remove.useMutation();

    const handleInputChange = (name: string, value: string | number) => {
        if (isEditMode && selectedClass) {
            setSelectedClass(prev => ({
                ...prev!,
                [name]: value,
            }));
        } else {
            setNewClass(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleCreateOrUpdateClass = async () => {
        try {
            const promise = async () => {
                if (isEditMode && selectedClass) {
                    await updateClassMutation.mutateAsync({
                        id_class: selectedClass.id_class!,
                        name: selectedClass.name,
                        limit: selectedClass.limit,
                        price: selectedClass.price,
                        id_employee: selectedClass.id_employee,
                    });
                } else {
                    await createClassMutation.mutateAsync({
                        name: newClass.name,
                        limit: newClass.limit,
                        price: newClass.price,
                        id_employee: newClass.id_employee,
                    });
                }

                await utils.class.list.invalidate();
                setIsSheetOpen(false);
                setIsEditMode(false);
                setSelectedClass(null);
                setNewClass({
                    name: "",
                    limit: 0,
                    price: 0,
                    id_employee: "",
                });
            };

            toast.promise(promise, {
                loading: 'Loading...',
                success: `Class ${isEditMode ? 'updated' : 'created'} successfully!`,
                error: (error) => error instanceof Error ? error.message : String(error),
            });
        } catch (error) {
            console.error("Error handling class:", error);
        }
    };

    const handleEditClass = (class_: Class) => {
        setSelectedClass(class_);
        setIsEditMode(true);
        setIsSheetOpen(true);
    };

    const handleDeleteClass = async (class_: Class) => {
        if (!class_.id_class) return;

        const promise = deleteClassMutation.mutateAsync({ 
            id_class: class_.id_class 
        });

        toast.promise(promise, {
            loading: 'Deleting class...',
            success: 'Class deleted successfully!',
            error: (error) => error instanceof Error ? error.message : String(error),
        });

        await promise;
        await utils.class.list.invalidate();
    };

    const handlePaginationChange = (page: number, limit: number) => {
        utils.class.list.invalidate({ page, limit });
    };

    const columns = classColumns({ 
        onEdit: handleEditClass,
        onDelete: handleDeleteClass,
        onEditMember: () => {}, // Add empty handler for onEditMember
        onDeleteMember: () => {} // Add empty handler for onDeleteMember
    });

    return (
        <>
            <Sheet open={isSheetOpen} onOpenChange={(open) => {
                setIsSheetOpen(open);
                if (!open) {
                    setIsEditMode(false);
                    setSelectedClass(null);
                }
            }}>
                <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
                    <div className="flex items-center justify-between space-y-2">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Class Management
                            </h2>
                            <p className="text-muted-foreground">
                                Here&apos;s a list of all classes
                            </p>
                        </div>
                        <SheetTrigger asChild>
                            <Button className="mb-4 bg-infinity">
                                <Plus className="mr-2 h-4 w-4" /> Add Class
                            </Button>
                        </SheetTrigger>
                    </div>
                    <DataTable
                        columns={columns}
                        data={{
                            items: classes.items,
                            total: classes.total,
                            page: classes.page,
                            limit: classes.limit
                        }}
                        onPaginationChange={handlePaginationChange}
                        searchColumns={[
                            { id: "name", placeholder: "Search by class name..." },
                        ]}
                        onSearch={(value, column) => {
                            setSearch(value);
                            setSearchColumn(column);
                        }}
                    />
                </div>
                <ClassForm
                    classData={selectedClass || newClass}
                    onCreateOrUpdateClass={handleCreateOrUpdateClass}
                    onInputChange={handleInputChange}
                    isEditMode={isEditMode}
                />
            </Sheet>
        </>
    );
}
