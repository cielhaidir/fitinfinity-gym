"use client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"

import { PersonalTrainer } from "./schema"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions"

interface ColumnsProps {
  onEditMember: (member: any) => void,
  onDeleteMember: (member: any) => void,
}

export const createColumns = ({ onEditMember, onDeleteMember }: ColumnsProps): ColumnDef<PersonalTrainer>[] => [
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
    cell: ({ row }) => <div className="hidden md:block">{row.original.user.email}</div>,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => <div className="hidden md:block">{row.getValue("description")}</div>,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]">
        <Badge 
          variant={row.getValue("isActive") ? "default" : "secondary"}
          className={row.getValue("isActive") ? "bg-[#C9D953] hover:bg-[#B8C84A]" : ""}
        >
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
    cell: ({ row }) => (
      <div className="w-[150px] hidden md:block">
        {new Date(row.getValue("createdAt")).toLocaleDateString()}
      </div>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => (
      <div className="w-[150px] hidden md:block">
        {new Date(row.getValue("updatedAt")).toLocaleDateString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => onEditMember(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => onDeleteMember(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          {/* Mobile actions */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEditMember(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    },
  },
]


