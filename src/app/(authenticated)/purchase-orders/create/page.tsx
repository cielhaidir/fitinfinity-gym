"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronsUpDown,
  Check,
  Save,
  Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Types
interface OrderItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  notes?: string;
}

interface POSItem {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  stock: number;
  category: {
    id: string;
    name: string;
  } | null;
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function CreatePurchaseOrderPage() {
  const router = useRouter();

  // Form state
  const [supplierId, setSupplierId] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [tax, setTax] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [items, setItems] = useState<OrderItem[]>([]);

  // Item selection state
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const utils = api.useUtils();

  // Queries
  const { data: nextOrderNumber, isLoading: orderNumberLoading } =
    api.purchaseOrder.getNextOrderNumber.useQuery();

  const { data: suppliers, isLoading: suppliersLoading } =
    api.supplier.getAllActive.useQuery();

  const { data: posItemsData, isLoading: itemsLoading } =
    api.posItem.list.useQuery({
      page: 1,
      limit: 100,
      search: itemSearch || undefined,
    });

  // Filter out already added items
  const availableItems = useMemo(() => {
    const addedItemIds = new Set(items.map((item) => item.itemId));
    return (posItemsData?.items ?? []).filter(
      (item) => !addedItemIds.has(item.id)
    );
  }, [posItemsData?.items, items]);

  // Mutations
  const createMutation = api.purchaseOrder.create.useMutation({
    onSuccess: (data) => {
      toast.success("Purchase order created successfully");
      router.push(`/purchase-orders/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create purchase order");
    },
  });

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.subtotal, 0);
  }, [items]);

  const total = useMemo(() => {
    return subtotal + tax - discount;
  }, [subtotal, tax, discount]);

  // Handlers
  const handleAddItem = (posItem: POSItem) => {
    const newItem: OrderItem = {
      id: generateId(),
      itemId: posItem.id,
      itemName: posItem.name,
      quantity: 1,
      unitCost: posItem.cost ?? 0,
      subtotal: posItem.cost ?? 0,
    };
    setItems([...items, newItem]);
    setItemSearchOpen(false);
    setItemSearch("");
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleUpdateItemQuantity = (itemId: string, quantity: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, quantity);
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.unitCost,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateItemUnitCost = (itemId: string, unitCost: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newCost = Math.max(0, unitCost);
          return {
            ...item,
            unitCost: newCost,
            subtotal: item.quantity * newCost,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return { ...item, notes };
        }
        return item;
      })
    );
  };

  const validateForm = () => {
    if (items.length === 0) {
      toast.error("Please add at least one item to the order");
      return false;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`Invalid quantity for ${item.itemName}`);
        return false;
      }
      if (item.unitCost < 0) {
        toast.error(`Invalid unit cost for ${item.itemName}`);
        return false;
      }
    }

    return true;
  };

  const handleSaveDraft = () => {
    if (!validateForm()) return;

    createMutation.mutate({
      supplierId: supplierId || undefined,
      orderDate: orderDate ? new Date(orderDate) : undefined,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      notes: notes || undefined,
      tax,
      discount,
      items: items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        notes: item.notes,
      })),
    });
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // For now, just save as draft (will be submitted later via updateStatus)
    createMutation.mutate({
      supplierId: supplierId || undefined,
      orderDate: orderDate ? new Date(orderDate) : undefined,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      notes: notes || undefined,
      tax,
      discount,
      items: items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        notes: item.notes,
      })),
    });
  };

  const isPending = createMutation.isPending;

  return (
      <ProtectedRoute requiredPermissions={["menu:purchase-order"]}>
      <div className="space-y-6">
        {/* Header */}
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
            <h1 className="text-2xl font-bold tracking-tight">
              Create Purchase Order
            </h1>
            <p className="text-muted-foreground">
              {orderNumberLoading ? (
                <Skeleton className="h-4 w-32 inline-block" />
              ) : (
                `Order Number: ${nextOrderNumber}`
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Basic information about the purchase order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select
                      value={supplierId}
                      onValueChange={setSupplierId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliersLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : (
                          suppliers?.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                              {supplier.code && ` (${supplier.code})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedDate">Expected Delivery Date</Label>
                    <Input
                      id="expectedDate"
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>
                    Add items to the purchase order
                  </CardDescription>
                </div>
                <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="end">
                    <Command>
                      <CommandInput
                        placeholder="Search items..."
                        value={itemSearch}
                        onValueChange={setItemSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {itemsLoading ? "Loading..." : "No items found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableItems.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => handleAddItem(item)}
                            >
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.category?.name ?? "Uncategorized"} •
                                  Stock: {item.stock} •
                                  Cost: {formatCurrency(item.cost ?? 0)}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground">
                      No items added yet. Click &quot;Add Item&quot; to start.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-[100px]">Quantity</TableHead>
                          <TableHead className="w-[150px]">Unit Cost</TableHead>
                          <TableHead className="w-[150px] text-right">
                            Subtotal
                          </TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <span className="font-medium">
                                  {item.itemName}
                                </span>
                                <Input
                                  placeholder="Notes..."
                                  value={item.notes ?? ""}
                                  onChange={(e) =>
                                    handleUpdateItemNotes(item.id, e.target.value)
                                  }
                                  className="h-8 text-xs"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(
                                    item.id,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateItemUnitCost(
                                    item.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="tax" className="text-sm text-muted-foreground">
                      Tax
                    </Label>
                    <Input
                      id="tax"
                      type="number"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      className="h-8 w-[150px]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="discount"
                      className="text-sm text-muted-foreground"
                    >
                      Discount
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) =>
                        setDiscount(parseFloat(e.target.value) || 0)
                      }
                      className="h-8 w-[150px]"
                    />
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className="text-lg">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={isPending || items.length === 0}
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isPending ? "Saving..." : "Save as Draft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/purchase-orders")}
                    disabled={isPending}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}