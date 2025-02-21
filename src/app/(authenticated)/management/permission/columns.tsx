"use client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { PersonalTrainer } from "./schema"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions"
import { Permission } from "./schema"

interface ColumnsProps {
  onEditMember: (member: any) => void,
  onDeleteMember: (member: any) => void,
  onEdit: (permission: Permission) => void,
  onDelete: (permission: Permission) => void,
}

export const createColumns = ({ onEditMember, onDeleteMember, onEdit, onDelete }: ColumnsProps): ColumnDef<PersonalTrainer>[] => [
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
        className="translate-y-[2px] ring-offset-background ring-black"
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
    accessorKey: "user.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Trainer Name" />
    ),
    cell: ({ row }) => <div className="w-[150px]">{row.original.user.name}</div>,
  },
  {
    id: "email",
    accessorKey: "user.email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]">
        <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
          {row.getValue("isActive") ? "Active" : "Inactive"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => <div className="w-[150px]">{new Date(row.getValue("createdAt")).toLocaleDateString()}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => <div className="w-[150px]">{new Date(row.getValue("updatedAt")).toLocaleDateString()}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEditMember} onDelete={onDeleteMember} />,
  },
]

export const permissionColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Permission>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Permission Name" />
    ),
  },
  {
    id: "roles",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned Roles" />
    ),
    cell: ({ row }) => {
      const roles = row.original.roles?.map(r => r.role.name).join(", ") ?? "";
      return <div className="max-w-[200px] truncate">{roles}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} onDelete={onDelete} />,
  },
]


