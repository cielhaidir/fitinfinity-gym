"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Member } from "./schema"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Member>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Member Name" />
        ),
        cell: ({ row }) => <div className="w-[150px]">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "email",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => <div className="hidden md:block">{row.getValue("email")}</div>,
    },
    {
        accessorKey: "phone",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => <div className="hidden md:block">{row.getValue("phone")}</div>,
    },
    {
        accessorKey: "remainingSessions",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Remaining Sessions" />
        ),
        cell: ({ row }) => <div className="w-[100px]">{row.getValue("remainingSessions")}</div>,
    },
    {
        accessorKey: "subscriptionEndDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Subscription End Date" />
        ),
        cell: ({ row }) => (
            <div className="w-[150px] hidden md:block">
                {new Date(row.getValue("subscriptionEndDate")).toLocaleDateString()}
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
            const remainingSessions = row.original.remainingSessions;
            return (
                <div className="w-[100px]">
                    <Badge
                        variant={remainingSessions > 0 ? "default" : "destructive"}
                        className={remainingSessions > 0 ? "bg-[#C9D953] hover:bg-[#B8C84A]" : ""}
                    >
                        {remainingSessions > 0 ? "Active" : "Inactive"}
                    </Badge>
                </div>
            );
        },
    },
]; 