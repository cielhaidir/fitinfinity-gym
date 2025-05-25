"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { PaymentStatus, PackageType } from "@prisma/client";
import { Subscription } from "./schema";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Edit } from "lucide-react";

interface ColumnsProps {
    onViewMember?: (memberId: string) => void;
    onEdit?: (subscription: Subscription) => void;
}

export const createColumns = ({
    onViewMember,
    onEdit,
}: ColumnsProps): ColumnDef<Subscription>[] => {
    const utils = api.useUtils();
    const deleteSubscriptionMutation = api.subs.delete.useMutation({
        onMutate: async (deletedSubscription) => {
            // Cancel any outgoing refetches
            await utils.subs.list.cancel();

            // Snapshot the previous value
            const previousSubscriptions = utils.subs.list.getData();

            // Optimistically update to the new value
            utils.subs.list.setData(undefined, (old) => {
                if (!old) return { items: [], total: 0, page: 1, limit: 10 };
                return {
                    ...old,
                    items: old.items.filter((item) => item.id !== deletedSubscription.id),
                    total: old.total - 1
                };
            });

            // Return a context object with the snapshotted value
            return { previousSubscriptions };
        },
        onError: (err, newSubscription, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousSubscriptions) {
                utils.subs.list.setData(undefined, context.previousSubscriptions);
            }
            toast.error(err.message);
        },
        onSuccess: () => {
            toast.success('Subscription deleted successfully!');
        },
        onSettled: () => {
            // Always refetch after error or success to ensure cache is in sync
            utils.subs.list.invalidate();
        },
    });

    const handleDelete = async (id: string) => {
        if (!id) {
            toast.error("Cannot delete: No subscription ID provided");
            return;
        }

        if (window.confirm('Are you sure you want to delete this subscription?')) {
            try {
                await deleteSubscriptionMutation.mutateAsync({ id });
            } catch (error) {
                console.error("Error in handleDelete:", error);
            }
        }
    };

    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "member.user.name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Member Name" />
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.member?.user?.name || "-"}</span>
                    <span className="text-xs text-muted-foreground">{row.original.member?.user?.email}</span>
                </div>
            ),
        },
        {
            accessorKey: "package.name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Package" />
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span>{row.original.package?.name || "-"}</span>
                    <span className="text-xs text-muted-foreground">
                        {row.original.package?.price?.toLocaleString('id-ID', {
                            style: 'currency',
                            currency: 'IDR'
                        })}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "package.type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <Badge variant="outline">
                    {row.original.package?.type === PackageType.GYM_MEMBERSHIP
                        ? "Gym Membership"
                        : "Personal Trainer"}
                </Badge>
            ),
        },
        {
            accessorKey: "startDate",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Period" />
            ),
            cell: ({ row }) => {
                const startDate = row.original.startDate;
                const endDate = row.original.endDate;
                return (
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Start:</span>
                        <span>{startDate ? new Date(startDate).toLocaleDateString() : "-"}</span>
                        <span className="text-xs text-muted-foreground mt-1">End:</span>
                        <span>{endDate ? new Date(endDate).toLocaleDateString() : "-"}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "payments",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Payment Status" />
            ),
            cell: ({ row }) => {
                const payments = row.original.payments;
                const latestPayment = payments && payments.length > 0 
                    ? payments[payments.length - 1] 
                    : null;

                return (
                    <div className="flex flex-col gap-1">
                        <Badge 
                            variant={
                                latestPayment?.status === PaymentStatus.SUCCESS ? "default" :
                                latestPayment?.status === PaymentStatus.PENDING ? "secondary" :
                                "destructive"
                            }
                        >
                            {latestPayment?.status || "NO PAYMENT"}
                        </Badge>
                        {latestPayment && (
                            <span className="text-xs text-muted-foreground">
                                {latestPayment.method}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewMember?.(row.original.memberId)}
                            className="h-8 w-8 hover:bg-muted"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Member</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit?.(row.original)}
                            className="h-8 w-8 hover:bg-muted"
                        >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(row.original.id ?? "")}
                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                );
            },
        },
    ];
};