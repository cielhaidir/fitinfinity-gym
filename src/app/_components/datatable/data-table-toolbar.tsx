"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchColumns?: Array<{
    id: string;
    placeholder: string;
  }>;
}

export function DataTableToolbar<TData>({
  table,
  searchColumns,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      {searchColumns && (
        <div className="flex flex-1 items-center space-x-2">
          {searchColumns.map((column) => (
            <Input
              key={column.id}
              placeholder={column.placeholder}
              value={(table.getColumn(column.id)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(column.id)?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] lg:w-[200px]"
            />
          ))}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X />
            </Button>
          )}
        </div>
      )}
      <DataTableViewOptions table={table} />
    </div>
  )
}
