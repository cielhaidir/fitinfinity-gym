"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ArrowDownIcon, ArrowUpIcon, Package, AlertTriangle, Eye, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Types
interface StockItem {
  id: string;
  name: string;
  stock: number;
  warehouseStock: number;
  showcaseStock: number;
  minStock: number | null;
  price: number;
  cost: number | null;
  isActive: boolean;
  createdAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
}

// Stock Adjustment Modal Component
function StockAdjustmentModal({
  open,
  onOpenChange,
  selectedItem,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: StockItem | null;
  onSuccess: () => void;
}) {
  const [adjustmentType, setAdjustmentType] = useState<"ADJUSTMENT_IN" | "ADJUSTMENT_OUT">("ADJUSTMENT_IN");
  const [stockType, setStockType] = useState<"warehouse" | "showcase">("warehouse");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const adjustMutation = api.inventory.createAdjustment.useMutation({
    onSuccess: () => {
      toast.success("Stock adjustment created successfully");
      onOpenChange(false);
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create stock adjustment");
    },
  });

  const resetForm = () => {
    setAdjustmentType("ADJUSTMENT_IN");
    setStockType("warehouse");
    setQuantity("");
    setReason("");
    setNote("");
  };

  const handleSubmit = () => {
    if (!selectedItem) return;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please enter a reason for the adjustment");
      return;
    }

    adjustMutation.mutate({
      itemId: selectedItem.id,
      type: adjustmentType,
      stockType: stockType,
      quantity: qty,
      reason: reason.trim(),
      note: note.trim() || undefined,
    });
  };

  const currentStock = selectedItem ? 
    (stockType === "warehouse" ? selectedItem.warehouseStock : selectedItem.showcaseStock) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            {selectedItem
              ? `Adjust stock for: ${selectedItem.name}`
              : "Select an item to adjust"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="stockType">Stock Type</Label>
            <Select
              value={stockType}
              onValueChange={(value: "warehouse" | "showcase") => setStockType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stock type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warehouse">
                  Warehouse (Current: {selectedItem?.warehouseStock ?? 0})
                </SelectItem>
                <SelectItem value="showcase">
                  Showcase (Current: {selectedItem?.showcaseStock ?? 0})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adjustmentType">Adjustment Type</Label>
            <Select
              value={adjustmentType}
              onValueChange={(value: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT") => setAdjustmentType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADJUSTMENT_IN">
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                    Stock In (Increase)
                  </div>
                </SelectItem>
                <SelectItem value="ADJUSTMENT_OUT">
                  <div className="flex items-center gap-2">
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                    Stock Out (Decrease)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {adjustmentType === "ADJUSTMENT_OUT" && parseInt(quantity) > currentStock && (
              <p className="text-sm text-destructive">
                Warning: Quantity exceeds available stock ({currentStock})
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason *</Label>
            <Input
              id="reason"
              placeholder="e.g., Inventory count, Damaged goods, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Additional Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Any additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={adjustMutation.isPending || !quantity || !reason.trim()}
          >
            {adjustMutation.isPending ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Stock Transfer Modal Component
function StockTransferModal({
  open,
  onOpenChange,
  selectedItem,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: StockItem | null;
  onSuccess: () => void;
}) {
  const [transferQuantity, setTransferQuantity] = useState<string>("");
  const [transferNote, setTransferNote] = useState("");

  const transferMutation = api.inventory.transferStock.useMutation({
    onSuccess: () => {
      toast.success("Stock transferred successfully");
      onOpenChange(false);
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to transfer stock");
    },
  });

  const resetForm = () => {
    setTransferQuantity("");
    setTransferNote("");
  };

  const handleTransferStock = () => {
    if (!selectedItem) return;

    const qty = parseInt(transferQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (qty > selectedItem.warehouseStock) {
      toast.error("Quantity exceeds available warehouse stock");
      return;
    }

    transferMutation.mutate({
      itemId: selectedItem.id,
      quantity: qty,
      note: transferNote.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Stock: {selectedItem?.name}</DialogTitle>
          <DialogDescription>
            Move stock from warehouse to showcase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warehouse Stock</Label>
              <Input 
                value={selectedItem?.warehouseStock ?? 0} 
                disabled 
              />
            </div>
            <div>
              <Label>Showcase Stock</Label>
              <Input 
                value={selectedItem?.showcaseStock ?? 0} 
                disabled 
              />
            </div>
          </div>
          <div>
            <Label>Quantity to Transfer</Label>
            <Input
              type="number"
              min="1"
              max={selectedItem?.warehouseStock ?? 0}
              placeholder="Enter quantity"
              value={transferQuantity}
              onChange={(e) => setTransferQuantity(e.target.value)}
            />
            {parseInt(transferQuantity) > (selectedItem?.warehouseStock ?? 0) && (
              <p className="mt-1 text-sm text-destructive">
                Quantity exceeds available warehouse stock
              </p>
            )}
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea 
              placeholder="Add a note about this transfer..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransferStock}
            disabled={transferMutation.isPending || !transferQuantity}
          >
            {transferMutation.isPending ? "Transferring..." : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Item Detail Modal Component
function ItemDetailModal({
  open,
  onOpenChange,
  itemId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}) {
  const { data: itemSummary, isLoading } = api.inventory.getItemStockSummary.useQuery(
    { itemId: itemId ?? "" },
    { enabled: !!itemId && open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Stock Details</DialogTitle>
          <DialogDescription>
            {itemSummary?.item.name ?? "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : itemSummary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Warehouse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{itemSummary.item.warehouseStock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Showcase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{itemSummary.item.showcaseStock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{itemSummary.item.stock}</p>
                  {itemSummary.item.minStock && (
                    <p className="text-xs text-muted-foreground">
                      Min: {itemSummary.item.minStock}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">
                    +{itemSummary.monthlyMovement.totalIn}
                  </span>
                  <span className="text-red-600">
                    -{itemSummary.monthlyMovement.totalOut}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Net: {itemSummary.monthlyMovement.netChange > 0 ? "+" : ""}
                  {itemSummary.monthlyMovement.netChange}
                </p>
              </CardContent>
            </Card>

            <div>
              <h4 className="mb-2 font-medium">Recent Transactions</h4>
              <div className="max-h-[200px] overflow-y-auto rounded-md border">
                {itemSummary.recentTransactions.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">
                    No recent transactions
                  </p>
                ) : (
                  <div className="divide-y">
                    {itemSummary.recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium">{tx.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.reason} • {tx.user?.name ?? "System"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${
                              tx.quantity > 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {tx.quantity > 0 ? "+" : ""}
                            {tx.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Page Component
export default function StockLevelsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Queries
  const { data: stockData, isLoading } = api.inventory.getStockLevels.useQuery({
    page,
    limit,
    search: search || undefined,
    categoryId,
    lowStockOnly,
  });

  const { data: lowStockCount } = api.inventory.getLowStockCount.useQuery();

  const { data: categories } = api.posCategory.list.useQuery({
    page: 1,
    limit: 100,
  });

  // Handlers
  const handleAdjustStock = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustModalOpen(true);
  };

  const handleTransferStock = (item: StockItem) => {
    setSelectedItem(item);
    setTransferDialogOpen(true);
  };

  const handleViewDetails = (item: StockItem) => {
    setDetailItemId(item.id);
    setDetailModalOpen(true);
  };

  const handleAdjustmentSuccess = () => {
    utils.inventory.getStockLevels.invalidate();
    utils.inventory.getLowStockCount.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  // Columns definition
  const columns: ColumnDef<StockItem>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.minStock !== null && row.original.stock <= row.original.minStock && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category?.name ?? "Uncategorized"}</Badge>
      ),
    },
    {
      accessorKey: "warehouseStock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
      cell: ({ row }) => (
        <div className="font-medium">{row.original.warehouseStock}</div>
      ),
    },
    {
      accessorKey: "showcaseStock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Showcase" />,
      cell: ({ row }) => (
        <div className="font-medium">{row.original.showcaseStock}</div>
      ),
    },
    {
      accessorKey: "stock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const stock = row.original.stock;
        const minStock = row.original.minStock;
        const isLowStock = minStock !== null && stock <= minStock;

        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isLowStock ? "text-destructive" : ""}`}>
              {stock}
            </span>
            {isLowStock && (
              <Badge variant="destructive" className="text-xs">
                Low Stock
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "minStock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Min Stock" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.minStock ?? "-"}</span>
      ),
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => (
        <span>
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
          }).format(row.original.price)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTransferStock(row.original)}
          >
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdjustStock(row.original)}
          >
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  // Prepare table data
  const tableData = {
    items: stockData?.data ?? [],
    total: stockData?.total ?? 0,
    page: stockData?.page ?? 1,
    limit: limit,
  };

  return (
       <ProtectedRoute requiredPermissions={["menu:inventory"]}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stockData?.total ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-destructive">
                  {lowStockCount?.count ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Filter</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant={lowStockOnly ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setLowStockOnly(!lowStockOnly);
                  setPage(1);
                }}
              >
                {lowStockOnly ? "Show All" : "Low Stock Only"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="w-[200px]">
            <Select
              value={categoryId ?? "all"}
              onValueChange={(value) => {
                setCategoryId(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.items.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={tableData}
          onPaginationChange={handlePaginationChange}
          searchColumns={[{ id: "name", placeholder: "Search by item name..." }]}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          isLoading={isLoading}
        />

        {/* Modals */}
        <StockAdjustmentModal
          open={adjustModalOpen}
          onOpenChange={setAdjustModalOpen}
          selectedItem={selectedItem}
          onSuccess={handleAdjustmentSuccess}
        />

        <StockTransferModal
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          selectedItem={selectedItem}
          onSuccess={handleAdjustmentSuccess}
        />

        <ItemDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          itemId={detailItemId}
        />
      </div>
    </ProtectedRoute>
  );
}