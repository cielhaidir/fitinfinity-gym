"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { PaymentStatus, PackageType } from "@prisma/client";
import { Subscription } from "./schema";

interface ColumnsProps {
    onEditModel?: (pack: any) => void;
    onDeleteModel?: (pack: any) => void;
}

export const createColumns = ({
    onEditModel,
    onDeleteModel,
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
                    className="translate-y-[2px] ring-black ring-offset-background"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px] ring-infinity"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "package.name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Package" />
            ),
            cell: ({ row }) => (
                <div className="w-[200px]">{row.original.package.name|| "-"}</div>
            ),
        },
        {
            accessorKey: "package.type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <Badge variant="outline" className="w-[150px] justify-center">
                    {row.original.package.type === PackageType.GYM_MEMBERSHIP
                        ? "Gym Membership"
                        : "Personal Trainer"}
                </Badge>
            ),
        },
        {
            accessorKey: "startDate",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Start Date" />
            ),
            cell: ({ row }) => (
                <div className="w-[150px]">
                    {new Date(row.getValue("startDate")).toLocaleDateString()}
                </div>
            ),
        },
        {
            accessorKey: "endDate",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="End Date" />
            ),
            cell: ({ row }) => (
                <div className="w-[150px]">
                    {new Date(row.getValue("endDate")).toLocaleDateString()}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DataTableRowActions
                    row={row}
                    onEdit={onEditModel}
                    onDelete={onDeleteModel}
                />
            ),
        },
    ];
