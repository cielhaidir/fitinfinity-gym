"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: {
    items: TData[];
    total: number;
    page: number;
    limit: number;
  };
  onPaginationChange?: (page: number, limit: number) => void;
  searchColumns?: Array<{
    id: string;
    placeholder: string;
  }>;
  onSearch?: (value: string, column: string) => void;
  onRowClick?: ((row: TData) => void) | null;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onPaginationChange,
  searchColumns,
  onSearch,
  onRowClick,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data: data.items,
    columns,
    pageCount: Math.ceil(data.total / data.limit),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex: data.page - 1,
        pageSize: data.limit,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newPagination = updater({
          pageIndex: data.page - 1,
          pageSize: data.limit,
        });
        onPaginationChange?.(
          newPagination.pageIndex + 1,
          newPagination.pageSize,
        );
      }
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchColumns={searchColumns}
        onSearch={onSearch}
      />
       <div className="w-full overflow-auto rounded-md border">

{/* Desktop table */}
<div className="hidden sm:block">
  <Table className="min-w-full">
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead
              key={header.id}
              colSpan={header.colSpan}
              className="bg-infinity text-secondary whitespace-nowrap"
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>

    <TableBody>
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            Loading...
          </TableCell>
        </TableRow>
      ) : table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row, rowIndex) => (
          <TableRow
            key={row.id}
            onClick={() => onRowClick?.(row.original)}
            data-state={row.getIsSelected() && "selected"}
            className={rowIndex % 2 === 0 ? "bg-muted/55" : ""}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id} className="py-2">
                <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</div>

{/* Mobile card view */}
<div className="sm:hidden p-4">
  {isLoading ? (
    <div className="text-center py-8 text-muted-foreground">Loading...</div>
  ) : table.getRowModel().rows?.length ? (
    table.getRowModel().rows.map((row) => (
      <div key={row.id} className="rounded-md border p-4 mb-4 bg-card">
        {row.getVisibleCells().map((cell) => (
          <div key={cell.id} className="mb-2 last:mb-0">
            <div className="font-semibold text-sm text-muted-foreground">
              {cell.column.columnDef.header as string}
            </div>
            <div className="text-sm text-foreground">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </div>
        ))}
      </div>
    ))
  ) : (
    <div className="text-center py-8 text-muted-foreground">No results.</div>
  )}
</div>

</div>
      <DataTablePagination table={table} />
    </div>
  );
}
