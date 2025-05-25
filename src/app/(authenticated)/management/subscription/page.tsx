"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { Subscription } from "./schema";
import { toast } from "sonner"
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import EditModal from "./edit-modal";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";

export default function SubscriptionPage() {
    const utils = api.useUtils();
    const router = useRouter();
    const deleteSubscriptionMutation = api.subs.delete.useMutation();
    const updateSubscriptionMutation = api.subs.update.useMutation();

    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isSelectingMember, setIsSelectingMember] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

    // Query for subscriptions
    const { data: subscriptionData = { items: [], total: 0, page: 1, limit: 10 } } = api.subs.list.useQuery({
        page,
        limit,
        search,
        searchColumn
    });

    // Query for members in modal
    const { data: members = { items: [] } } = api.member.list.useQuery({
        page: 1,
        limit: 50,
        search: memberSearch,
        searchColumn: "user.name"
    });

    const handlePaginationChange = (newPage: number, newLimit: number) => {
        setPage(newPage);
        setLimit(newLimit);
    };

    // Function to view member's subscriptions
    const viewMemberSubscriptions = (memberId: string) => {
        router.push(`/management/subscription/${memberId}`);
    };

    const handleSelectMember = (memberId: string) => {
        setIsSelectingMember(false);
        router.push(`/checkout/${memberId}`);
    };

    const handleDelete = async (id: string) => {
        setSubscriptionToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleEdit = (subscription: Subscription) => {
        setSelectedSubscription(subscription);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async (updated: Subscription) => {
        try {
            await updateSubscriptionMutation.mutateAsync({
                id: updated.id!,
                endDate: new Date(updated.endDate!),
            });
            toast.success('Subscription updated successfully!');
            await utils.subs.list.invalidate();
            setEditModalOpen(false);
            setSelectedSubscription(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : String(error));
        }
    };

    const confirmDelete = async () => {
        if (!subscriptionToDelete) return;

        try {
            await deleteSubscriptionMutation.mutateAsync({ id: subscriptionToDelete });
            toast.success('Subscription deleted successfully!');
            await utils.subs.list.invalidate();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : String(error));
        } finally {
            setDeleteDialogOpen(false);
            setSubscriptionToDelete(null);
        }
    };

    const columns = createColumns({ 
        onViewMember: viewMemberSubscriptions,
        onEdit: handleEdit
    });

    return (
        <>
            <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Subscription Management
                        </h2>
                        <p className="text-muted-foreground">
                            Here&apos;s a list of all member subscriptions
                        </p>
                    </div>
                    <Button 
                        className="mb-4 bg-infinity"
                        onClick={() => setIsSelectingMember(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Subscription
                    </Button>
                </div>
                <DataTable
                    data={subscriptionData}
                    columns={columns}
                    onPaginationChange={handlePaginationChange}
                    searchColumns={[
                        { id: "member.user.name", placeholder: "Search by member name..." },
                        { id: "package.name", placeholder: "Search by package..." },
                    ]}
                    onSearch={(value, column) => {
                        setSearch(value);
                        setSearchColumn(column);
                        setPage(1); // Reset to first page when searching
                    }}
                />
            </div>

            <Dialog open={isSelectingMember} onOpenChange={setIsSelectingMember}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Select Member for New Subscription</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Search members..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="mb-4"
                        />
                        <div className="max-h-[400px] overflow-y-auto">
                            {members.items.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg dark:hover:text-gray-50 transition-colors"
                                    onClick={() => handleSelectMember(member.id)}
                                >
                                    <div>
                                        <div className="font-medium">{member.user?.name}</div>
                                        <div className="text-sm text-gray-500 dark:hover:text-gray-300">{member.user?.email}</div>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:hover:text-gray-300">
                                        {member.rfidNumber}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the subscription
                            and all associated payment records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <EditModal
                open={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setSelectedSubscription(null);
                }}
                subscription={selectedSubscription}
                onSave={handleSaveEdit}
            />
        </>
    );
}