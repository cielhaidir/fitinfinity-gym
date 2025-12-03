"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Clock,
  ShoppingCart,
  PackageCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";

// Types
interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: Date | null;
  expectedDate: Date | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  supplier: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  _count: {
    items: number;
  };
}

// Status badge colors
const getStatusBadge = (status: string) => {
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
  > = {
    DRAFT: { variant: "secondary", className: "bg-gray-100 text-gray-800" },
    PENDING: { variant: "outline", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    ORDERED: { variant: "default", className: "bg-blue-100 text-blue-800" },
    PARTIALLY_RECEIVED: { variant: "outline", className: "bg-orange-100 text-orange-800 border-orange-300" },
    RECEIVED: { variant: "default", className: "bg-green-100 text-green-800" },
    CANCELLED: { variant: "destructive", className: "bg-red-100 text-red-800" },
  };

  const config = statusConfig[status] ?? { variant: "secondary" as const, className: "" };

  return (
    <Badge variant={config.variant} className={config.className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Delete Confirmation Dialog
function DeleteConfirmDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  onSuccess: () => void;
}) {
  const deleteMutation = api.purchaseOrder.delete.useMutation({
    onSuccess: () => {
      toast.success("Purchase order deleted successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete purchase order");
    },
  });

  const handleDelete = () => {
    if (purchaseOrder) {
      deleteMutation.mutate({ id: purchaseOrder.id });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {purchaseOrder && (
              <>
                You are about to delete the purchase order{" "}
                <strong>{purchaseOrder.orderNumber}</strong>. This action cannot
                be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Main Page Component
export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const utils = api.useUtils();

  // Queries
  const { data: ordersData, isLoading } = api.purchaseOrder.list.useQuery({
    page,
    limit,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as "DRAFT" | "PENDING" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED"),
    supplierId: supplierFilter === "all" ? undefined : supplierFilter,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  const { data: stats, isLoading: statsLoading } = api.purchaseOrder.getStats.useQuery();

  const { data: suppliers } = api.supplier.getAllActive.useQuery();

  // Handlers
  const handleCreateOrder = () => {
    router.push("/purchase-orders/create");
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    router.push(`/purchase-orders/${order.id}`);
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    router.push(`/purchase-orders/${order.id}/edit`);
  };

  const handleDeleteOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    utils.purchaseOrder.list.invalidate();
    utils.purchaseOrder.getStats.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  // Columns definition
  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: "orderNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order Number" />
      ),
      cell: ({ row }) => (
        <button
          onClick={() => handleViewOrder(row.original)}
          className="font-medium text-primary hover:underline"
        >
          {row.original.orderNumber}
        </button>
      ),
    },
    {
      accessorKey: "supplier",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => (
        <span>{row.original.supplier?.name ?? "-"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.orderDate
            ? format(new Date(row.original.orderDate), "MMM d, yyyy")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "expectedDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expected Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.expectedDate
            ? format(new Date(row.original.expectedDate), "MMM d, yyyy")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.total)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        const canEdit = ["DRAFT", "PENDING"].includes(order.status);
        const canDelete = order.status === "DRAFT";

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewOrder(order)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditOrder(order)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteOrder(order)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Prepare table data
  const tableData = {
    items: ordersData?.data ?? [],
    total: ordersData?.total ?? 0,
    page: ordersData?.page ?? 1,
    limit: limit,
  };

  return (
       <ProtectedRoute requiredPermissions={["menu:purchase-order"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
            <p className="text-muted-foreground">
              Manage purchase orders and track deliveries from suppliers.
            </p>
          </div>
          <Button onClick={handleCreateOrder}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-gray-600">
                  {stats?.draft ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.pending ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordered</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.ordered ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partially Received</CardTitle>
              <PackageCheck className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.partiallyReceived ?? 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="w-[200px]">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[200px]">
            <Select
              value={supplierFilter}
              onValueChange={(value) => {
                setSupplierFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateRangePicker
            date={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={tableData}
          onPaginationChange={handlePaginationChange}
          searchColumns={[
            { id: "orderNumber", placeholder: "Search by order number..." },
          ]}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          isLoading={isLoading}
        />

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          purchaseOrder={selectedOrder}
          onSuccess={handleDeleteSuccess}
        />
      </div>
    </ProtectedRoute>
  );
}