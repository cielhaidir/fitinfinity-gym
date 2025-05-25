"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { PackageType } from "@prisma/client";
import { Package } from "./schema";

interface ColumnsProps {
    onEditModel: (pack: any) => void;
    onDeleteModel: (pack: any) => void;
}

export const createColumns = ({
    onEditModel,
    onDeleteModel,
}: ColumnsProps): ColumnDef<Package>[] => [
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
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => <div className="w-[200px]">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "description",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Description" />
            ),
            cell: ({ row }) => (
                <div className="w-[200px]">{row.getValue("description") || "-"}</div>
            ),
        },
        {
            accessorKey: "price",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Price" />
            ),
            cell: ({ row }) => (
                <div className="w-[100px]">
                    Rp {(row.getValue("price") as number).toLocaleString()}
                </div>
            ),
        },
        {
            accessorKey: "type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <Badge variant="outline" className="w-[150px] justify-center">
                    {row.getValue("type") === PackageType.GYM_MEMBERSHIP
                        ? "Gym Membership"
                        : "Personal Trainer"}
                </Badge>
            ),
        },
        // {
        //     accessorKey: "sessions",
        //     header: ({ column }) => (
        //         <DataTableColumnHeader column={column} title="Sessions" />
        //     ),
        //     cell: ({ row }) => (
        //         <div className="w-[100px]">{row.getValue("sessions") ?? "-"}</div>
        //     ),
        //     enableHiding: true,
            
        // },
        // {
        //     accessorKey: "day",
        //     header: ({ column }) => (
        //         <DataTableColumnHeader column={column} title="Days" />
        //     ),
        //     cell: ({ row }) => (
        //         <div className="w-[100px]">{row.getValue("day") ?? "-"}</div>
        //     ),
            
        // },
        {
            accessorKey: "duration",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Duration" />
            ),
            cell: ({ row }) => {
                const type = row.getValue("type") as PackageType;
                if (type === PackageType.GYM_MEMBERSHIP) {
                    return (
                        <div className="w-[150px]">
                            {row.original.day ?? '0'} Days
                        </div>
                    );
                } else {
                    return (
                        <div className="w-[200px]">
                            <div>{row.original.sessions ?? '0'} Sessions</div>
                            <div className="text-sm text-muted-foreground">
                                Valid for {row.original.day ?? '0'} days
                            </div>
                        </div>
                    );
                }
            },
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => (
                <Badge
                    variant={row.getValue("isActive") ? "default" : "destructive"}
                    className="w-[100px] justify-center"
                >
                    {row.getValue("isActive") ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        // {
        //     accessorKey: "createdAt",
        //     header: ({ column }) => (
        //         <DataTableColumnHeader column={column} title="Created At" />
        //     ),
        //     cell: ({ row }) => (
        //         <div className="w-[150px]">
        //             {new Date(row.getValue("createdAt")).toLocaleDateString()}
        //         </div>
        //     ),
        // },
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
