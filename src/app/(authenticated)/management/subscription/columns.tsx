"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { PaymentStatus, PackageType } from "@prisma/client";
import { Subscription } from "./schema";

interface ColumnsProps {
    onViewMember?: (memberId: string) => void;
}

export const createColumns = ({
    onViewMember,
}: ColumnsProps): ColumnDef<Subscription>[] => [
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
                                latestPayment?.status === PaymentStatus.SUCCESS ? "success" :
                                latestPayment?.status === PaymentStatus.PENDING ? "warning" :
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
            cell: ({ row }) => (
                <DataTableRowActions
                    row={row}
                    actions={[
                        {
                            label: "View Member Details",
                            onClick: () => onViewMember?.(row.original.memberId),
                        },
                    ]}
                />
            ),
        },
    ];
