# Data Table Column Structure Guide

## Basic Structure

1. Import required dependencies

## Column Interface

The columns are created using a function that accepts the following props:

- `onEditModel`: Callback function for editing a model
- `onDeleteModel`: Callback function for deleting a model

## Column Definitions

1. **Select Column**

   - Type: Checkbox
   - Features: Row selection, All rows selection
   - Not sortable or hideable

2. **Other column from prisma model**

3. **Actions**
   - Type: Row actions
   - Features: Edit and Delete actions

## Notes

- All date fields are formatted using `toLocaleDateString()`
- Columns use `DataTableColumnHeader` component for consistent header styling
- Actions column uses `DataTableRowActions` component
- All column take from schema prisma

## Template For Schema

```typescript
"use client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { Model } from "./schema"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions"

interface ColumnsProps {
  onEditModel: (member: any) => void,
  onDeleteModel: (member: any) => void,
}


export const createColumns = ({ onEditModel, onDeleteModel }: ColumnsProps): ColumnDef<Model>[] => [
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
    //   Add other column from prisma model
    //   example for relation
  {
    accessorKey: "user.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Member Name" />
    ),
    cell: ({ row }) => <div className="w-[150px]">{row.original.user.name}</div>,
  },

    //  example for date
    accessorKey: "registerDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Register Date" />
    ),
    cell: ({ row }) => <div className="w-[150px]">{new Date(row.getValue("registerDate")).toLocaleDateString()}</div>,
  },

  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Active" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]">
        {row.getValue("isActive") ? "Active" : "Inactive"}
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
    cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEditModel} onDelete={onDeleteModel} />,
  },
]



```
