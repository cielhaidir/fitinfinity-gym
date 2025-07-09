"use client";

import { type Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchColumns?: Array<{
    id: string;
    placeholder: string;
  }>;
  onSearch?: (value: string, column: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  searchColumns,
  onSearch,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [selectedColumn, setSelectedColumn] = useState(
    searchColumns?.[0]?.id ?? "",
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {searchColumns && (
        <div className="flex flex-1 items-center space-x-2">
          <Select value={selectedColumn} onValueChange={(value) => {
            console.log("TOOLBAR COLUMN CHANGE:", { from: selectedColumn, to: value });
            setSelectedColumn(value);
          }}>
            <SelectTrigger className="w-[140px] sm:w-[180px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {searchColumns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.placeholder}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search..."
            onChange={(event) => {
              console.log("TOOLBAR SEARCH:", { value: event.target.value, selectedColumn });
              onSearch?.(event.target.value, selectedColumn);
            }}
            className="h-8 flex-1 min-w-0 sm:w-[150px] lg:w-[200px]"
          />
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
      <div className="flex justify-end">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
