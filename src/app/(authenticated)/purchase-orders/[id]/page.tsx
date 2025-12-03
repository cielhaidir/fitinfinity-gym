"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  ShoppingCart,
  X,
  PackageCheck,
  Check,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Types
interface PurchaseOrderItem {
  id: string;
  itemId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  subtotal: number;
  status: string;
  notes: string | null;
  item: {
    id: string;
    name: string;
    price: number;
    cost: number | null;
    stock: number;
    category: {
      id: string;
      name: string;
    } | null;
  };
}

interface ReceiveItemInput {
  itemId: string;
  itemName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  receiveQuantity: number;
  notes: string;
}

// Status badge colors
const getStatusBadge = (status: string) => {
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: React.ReactNode }
  > = {
    DRAFT: { 
      variant: "secondary", 
      className: "bg-gray-100 text-gray-800",
      icon: <FileText className="h-3 w-3 mr-1" />
    },
    PENDING: { 
      variant: "outline", 
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: <Clock className="h-3 w-3 mr-1" />
    },
    ORDERED: { 
      variant: "default", 
      className: "bg-blue-100 text-blue-800",
      icon: <ShoppingCart className="h-3 w-3 mr-1" />
    },
    PARTIALLY_RECEIVED: { 
      variant: "outline", 
      className: "bg-orange-100 text-orange-800 border-orange-300",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />
    },
    RECEIVED: { 
      variant: "default", 
      className: "bg-green-100 text-green-800",
      icon: <Check className="h-3 w-3 mr-1" />
    },
    CANCELLED: { 
      variant: "destructive", 
      className: "bg-red-100 text-red-800",
      icon: <X className="h-3 w-3 mr-1" />
    },
  };

  const config = statusConfig[status] ?? { variant: "secondary" as const, className: "", icon: null };

  return (
    <Badge variant={config.variant} className={`${config.className} flex items-center`}>
      {config.icon}
      {status.replace(/_/g, " ")}
    </Badge>
  );
};

// Item status badge
const getItemStatusBadge = (status: string) => {
  const statusConfig: Record<string, { className: string }> = {
    PENDING: { className: "bg-gray-100 text-gray-800" },
    PARTIALLY_RECEIVED: { className: "bg-orange-100 text-orange-800" },
    RECEIVED: { className: "bg-green-100 text-green-800" },
  };

  const config = statusConfig[status] ?? { className: "" };

  return (
    <Badge variant="outline" className={config.className}>
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

// Receive Items Dialog
function ReceiveItemsDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  items,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  items: PurchaseOrderItem[];
  onSuccess: () => void;
}) {
  const [receiveItems, setReceiveItems] = useState<ReceiveItemInput[]>(() =>
    items
      .filter((item) => item.receivedQuantity < item.quantity)
      .map((item) => ({
        itemId: item.id,
        itemName: item.item.name,
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        pendingQuantity: item.quantity - item.receivedQuantity,
        receiveQuantity: item.quantity - item.receivedQuantity, // Default to pending
        notes: "",
      }))
  );

  const receiveItemsMutation = api.purchaseOrder.receiveItems.useMutation({
    onSuccess: () => {
      toast.success("Items received successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to receive items");
    },
  });

  const handleUpdateReceiveQuantity = (itemId: string, quantity: number) => {
    setReceiveItems(
      receiveItems.map((item) => {
        if (item.itemId === itemId) {
          return {
            ...item,
            receiveQuantity: Math.max(0, Math.min(quantity, item.pendingQuantity)),
          };
        }
        return item;
      })
    );
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setReceiveItems(
      receiveItems.map((item) => {
        if (item.itemId === itemId) {
          return { ...item, notes };
        }
        return item;
      })
    );
  };

  const handleSubmit = () => {
    const itemsToReceive = receiveItems
      .filter((item) => item.receiveQuantity > 0)
      .map((item) => ({
        itemId: item.itemId,
        receivedQuantity: item.receiveQuantity,
        notes: item.notes || undefined,
      }));

    if (itemsToReceive.length === 0) {
      toast.error("Please enter at least one item quantity to receive");
      return;
    }

    receiveItemsMutation.mutate({
      id: purchaseOrderId,
      items: itemsToReceive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receive Items</DialogTitle>
          <DialogDescription>
            Enter the quantities received for each item
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Ordered</TableHead>
                <TableHead className="text-center">Received</TableHead>
                <TableHead className="text-center">Pending</TableHead>
                <TableHead className="w-[120px]">Receive Qty</TableHead>
                <TableHead className="w-[200px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receiveItems.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell className="text-center">{item.orderedQuantity}</TableCell>
                  <TableCell className="text-center">{item.receivedQuantity}</TableCell>
                  <TableCell className="text-center">{item.pendingQuantity}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max={item.pendingQuantity}
                      value={item.receiveQuantity}
                      onChange={(e) =>
                        handleUpdateReceiveQuantity(
                          item.itemId,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Notes..."
                      value={item.notes}
                      onChange={(e) => handleUpdateNotes(item.itemId, e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={receiveItemsMutation.isPending}
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            {receiveItemsMutation.isPending ? "Processing..." : "Receive Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Status Update Confirmation Dialog
function StatusUpdateDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  currentStatus,
  targetStatus,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  currentStatus: string;
  targetStatus: "PENDING" | "ORDERED" | "CANCELLED";
  onSuccess: () => void;
}) {
  const statusLabels: Record<string, string> = {
    PENDING: "Submit",
    ORDERED: "Mark as Ordered",
    CANCELLED: "Cancel",
  };

  const statusDescriptions: Record<string, string> = {
    PENDING: "This will submit the purchase order for approval.",
    ORDERED: "This will mark the purchase order as ordered from the supplier.",
    CANCELLED: "This will cancel the purchase order. This action cannot be undone.",
  };

  const updateStatusMutation = api.purchaseOrder.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(`Purchase order ${statusLabels[targetStatus].toLowerCase()}ed successfully`);
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleConfirm = () => {
    updateStatusMutation.mutate({
      id: purchaseOrderId,
      status: targetStatus,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {statusLabels[targetStatus]} Purchase Order?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {statusDescriptions[targetStatus]}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              targetStatus === "CANCELLED"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending
              ? "Processing..."
              : statusLabels[targetStatus]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Delete Confirmation Dialog
function DeleteConfirmDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  orderNumber,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  orderNumber: string;
  onSuccess: () => void;
}) {
  const router = useRouter();

  const deleteMutation = api.purchaseOrder.delete.useMutation({
    onSuccess: () => {
      toast.success("Purchase order deleted successfully");
      onOpenChange(false);
      router.push("/purchase-orders");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete purchase order");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: purchaseOrderId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete purchase order{" "}
            <strong>{orderNumber}</strong>. This action cannot be undone.
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
export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"PENDING" | "ORDERED" | "CANCELLED">("PENDING");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const utils = api.useUtils();

  // Query
  const { data: order, isLoading, error } = api.purchaseOrder.getById.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  );

  // Handlers
  const handleRefresh = () => {
    utils.purchaseOrder.getById.invalidate({ id: orderId });
    utils.purchaseOrder.list.invalidate();
    utils.purchaseOrder.getStats.invalidate();
  };

  const handleStatusChange = (status: "PENDING" | "ORDERED" | "CANCELLED") => {
    setTargetStatus(status);
    setStatusDialogOpen(true);
  };

  if (error) {
    return (
         <ProtectedRoute requiredPermissions={["menu:purchase-order"]}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">Failed to load purchase order</p>
          <Button
            variant="outline"
            onClick={() => router.push("/purchase-orders")}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchase Orders
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  const canEdit = order && ["DRAFT", "PENDING"].includes(order.status);
  const canDelete = order && order.status === "DRAFT";
  const canSubmit = order && order.status === "DRAFT";
  const canMarkOrdered = order && order.status === "PENDING";
  const canCancel = order && ["DRAFT", "PENDING"].includes(order.status);
  const canReceive =
    order && ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status);

  return (
       <ProtectedRoute requiredPermissions={["menu:purchase-order"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/purchase-orders")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {order?.orderNumber}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    {order && getStatusBadge(order.status)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isLoading && order && (
            <div className="flex items-center gap-2">
              {canReceive && (
                <Button onClick={() => setReceiveDialogOpen(true)}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Receive Items
                </Button>
              )}
              {canMarkOrdered && (
                <Button onClick={() => handleStatusChange("ORDERED")}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Mark as Ordered
                </Button>
              )}
              {canSubmit && (
                <Button onClick={() => handleStatusChange("PENDING")}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/purchase-orders/${orderId}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("CANCELLED")}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : order ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Supplier</Label>
                      <p className="font-medium">
                        {order.supplier?.name ?? "Not specified"}
                        {order.supplier?.code && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({order.supplier.code})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Order Date</Label>
                      <p className="font-medium">
                        {order.orderDate
                          ? format(new Date(order.orderDate), "MMMM d, yyyy")
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Expected Delivery Date
                      </Label>
                      <p className="font-medium">
                        {order.expectedDate
                          ? format(new Date(order.expectedDate), "MMMM d, yyyy")
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created By</Label>
                      <p className="font-medium">
                        {order.creator?.name ?? "Unknown"}
                      </p>
                    </div>
                    {order.notes && (
                      <div className="sm:col-span-2">
                        <Label className="text-muted-foreground">Notes</Label>
                        <p className="font-medium">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>
                    {order.items.length} item(s) in this order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Ordered</TableHead>
                          <TableHead className="text-center">Received</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{item.item.name}</span>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.receivedQuantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell>
                              {getItemStatusBadge(item.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className="text-lg">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supplier Info */}
              {order.supplier && (
                <Card>
                  <CardHeader>
                    <CardTitle>Supplier Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{order.supplier.name}</p>
                    </div>
                    {order.supplier.contactName && (
                      <div>
                        <Label className="text-muted-foreground">Contact</Label>
                        <p className="font-medium">{order.supplier.contactName}</p>
                      </div>
                    )}
                    {order.supplier.email && (
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{order.supplier.email}</p>
                      </div>
                    )}
                    {order.supplier.phone && (
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium">{order.supplier.phone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline/History */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                    {order.orderDate && order.status !== "DRAFT" && (
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium">Ordered</p>
                          <p className="text-muted-foreground">
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                    {order.receivedDate && (
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <p className="font-medium">Fully Received</p>
                          <p className="text-muted-foreground">
                            {format(new Date(order.receivedDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {/* Dialogs */}
        {order && (
          <>
            <ReceiveItemsDialog
              open={receiveDialogOpen}
              onOpenChange={setReceiveDialogOpen}
              purchaseOrderId={orderId}
              items={order.items}
              onSuccess={handleRefresh}
            />
            <StatusUpdateDialog
              open={statusDialogOpen}
              onOpenChange={setStatusDialogOpen}
              purchaseOrderId={orderId}
              currentStatus={order.status}
              targetStatus={targetStatus}
              onSuccess={handleRefresh}
            />
            <DeleteConfirmDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              purchaseOrderId={orderId}
              orderNumber={order.orderNumber}
              onSuccess={handleRefresh}
            />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}