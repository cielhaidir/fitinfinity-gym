"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { FCMember } from "./schema"

export const getColumns = (): ColumnDef<FCMember>[] => [
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
        accessorKey: "birthDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Age" />
        ),
        cell: ({ row }) => {
            const birthDateString = row.getValue("birthDate") as string | null;
            if (!birthDateString) {
                return <div className="w-[80px]">-</div>;
            }
            const birthDate = new Date(birthDateString);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return <div className="w-[80px]">{age}</div>;
        },
    },
    {
        accessorKey: "height",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Height (cm)" />
        ),
        cell: ({ row }) => <div className="w-[100px]">{row.getValue("height") ? `${row.getValue("height")} cm` : "-"}</div>,
    },
    {
        accessorKey: "weight",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Weight (kg)" />
        ),
        cell: ({ row }) => <div className="w-[100px]">{row.getValue("weight") ? `${row.getValue("weight")} kg` : "-"}</div>,
    },
    {
        accessorKey: "registerDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Register Date" />
        ),
        cell: ({ row }) => (
            <div className="w-[150px] hidden md:block">
                {new Date(row.getValue("registerDate")).toLocaleDateString()}
            </div>
        ),
    },
    {
        accessorKey: "isActive",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
            const isActive = row.getValue("isActive") as boolean;
            return (
                <div className="w-[100px]">
                    <Badge
                        variant={isActive ? "default" : "destructive"}
                        className={isActive ? "bg-[#C9D953] hover:bg-[#B8C84A]" : ""}
                    >
                        {isActive ? "Active" : "Inactive"}
                    </Badge>
                </div>
            );
        },
    },
]; 