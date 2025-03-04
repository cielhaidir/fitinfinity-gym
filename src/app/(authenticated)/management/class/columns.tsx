"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Class } from "./schema"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions"

interface ColumnsProps {
    onEdit: (class_: Class) => void
    onDelete: (class_: Class) => void
}

export const columns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Class>[] => [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Class Name" />
        ),
    },
    {
        accessorKey: "limit",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Student Limit" />
        ),
        cell: ({ row }) => <div>{row.getValue("limit") || "No limit"}</div>,
    },
    {
        accessorKey: "trainer.user.name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Trainer" />
        ),
        cell: ({ row }) => <div>{row.original.trainer?.user?.name || "N/A"}</div>,
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Created At" />
        ),
        cell: ({ row }) => <div>{new Date(row.getValue("createdAt")).toLocaleDateString()}</div>,
    },
    {
        id: "actions",
        cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} onDelete={onDelete} />,
    },
] 