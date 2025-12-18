"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/_components/ui/dialog";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart, Trash2, CreditCard, History, Edit, Eye, Download, Filter, Calendar, BarChart3 } from "lucide-react";
import type { POSSaleItem } from "./schema";
import * as XLSX from "xlsx";
import { formatIDR } from "@/lib/format";

export default function POSPage() {
  const [cartItems, setCartItems] = useState<POSSaleItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [balanceAccountId, setBalanceAccountId] = useState<number | undefined>();
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [tax, setTax] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("pos");
  const [editingSale, setEditingSale] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("");
  const [filterCashier, setFilterCashier] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Summary tab states
  const [summaryDateFrom, setSummaryDateFrom] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0] || "";
  });
  const [summaryDateTo, setSummaryDateTo] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0] || "";
  });
  const [summaryPaymentMethod, setSummaryPaymentMethod] = useState<string>("all");

  const { data: categories } = api.posCategory.getAll.useQuery();
  const { data: items } = api.posItem.getAll.useQuery();
  const { data: balanceAccounts } = api.balanceAccount.getAll.useQuery({});
  const { data: recentSales, refetch: refetchSales } = api.posSale.list.useQuery({
    page: 1,
    limit: 20,
    search: searchTerm || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    cashierId: filterCashier || undefined,
  });
  const { data: allUsers } = api.user.all.useQuery();
  
  // Summary data queries
  const { data: summaryData, refetch: refetchSummary } = api.posSale.getSalesReport.useQuery({
    dateFrom: summaryDateFrom ? new Date(summaryDateFrom) : new Date(),
    dateTo: summaryDateTo ? new Date(summaryDateTo + 'T23:59:59') : new Date(),
  });
  const createSaleMutation = api.posSale.create.useMutation();
  const updateSaleMutation = api.posSale.update.useMutation();
  const deleteSaleMutation = api.posSale.delete.useMutation();
  const exportDataQuery = api.posSale.export.useQuery(
    {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      paymentMethod: filterPaymentMethod || undefined,
      cashierId: filterCashier || undefined,
      search: searchTerm || undefined,
    },
    {
      enabled: false,
    }
  );

  // Filter items by selected category
  const filteredItems = selectedCategory && selectedCategory !== "all"
    ? items?.filter(item => item.categoryId === selectedCategory)
    : items;

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal + tax - discount;
  const change = parseFloat(amountPaid) - total;

  const addToCart = (item: any) => {
    const existingItem = cartItems.find(cartItem => cartItem.itemId === item.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(cartItem =>
        cartItem.itemId === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1, subtotal: (cartItem.quantity + 1) * cartItem.price }
          : cartItem
      ));
    } else {
      const newItem: POSSaleItem = {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        subtotal: item.price,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems(cartItems.filter(item => item.itemId !== itemId));
    } else {
      setCartItems(cartItems.map(item =>
        item.itemId === itemId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
          : item
      ));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.itemId !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setAmountPaid("");
    setNotes("");
    setTax(0);
    setDiscount(0);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (parseFloat(amountPaid) < total) {
      toast.error("Amount paid is less than total");
      return;
    }

    const promise = async () => {
      await createSaleMutation.mutateAsync({
        items: cartItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        tax,
        discount,
        total,
        amountPaid: parseFloat(amountPaid),
        paymentMethod,
        balanceId: balanceAccountId,
        notes: notes || undefined,
      });

      clearCart();
      refetchSales();
    };

    toast.promise(promise, {
      loading: "Processing sale...",
      success: "Sale completed successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  };

  const handleEditSale = (sale: any) => {
    setEditingSale(sale);
    setCartItems(sale.items.map((item: any) => ({
      itemId: item.itemId,
      name: item.item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })));
    setPaymentMethod(sale.paymentMethod);
    setBalanceAccountId(sale.balanceId);
    setAmountPaid(sale.amountPaid.toString());
    setNotes(sale.notes || "");
    setTax(sale.tax);
    setDiscount(sale.discount);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSale = async () => {
    if (!editingSale || cartItems.length === 0) {
      toast.error("Invalid sale data");
      return;
    }

    if (parseFloat(amountPaid) < total) {
      toast.error("Amount paid is less than total");
      return;
    }

    const promise = async () => {
      await updateSaleMutation.mutateAsync({
        id: editingSale.id,
        items: cartItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        tax,
        discount,
        total,
        amountPaid: parseFloat(amountPaid),
        paymentMethod,
        balanceId: balanceAccountId,
        notes: notes || undefined,
      });

      clearCart();
      setEditingSale(null);
      setIsEditDialogOpen(false);
      refetchSales();
    };

    toast.promise(promise, {
      loading: "Updating sale...",
      success: "Sale updated successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm("Are you sure you want to delete this sale?")) {
      return;
    }

    const promise = async () => {
      await deleteSaleMutation.mutateAsync({ id: saleId });
      refetchSales();
    };

    toast.promise(promise, {
      loading: "Deleting sale...",
      success: "Sale deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  };

  const cancelEdit = () => {
    setEditingSale(null);
    setIsEditDialogOpen(false);
    clearCart();
  };

  const handleExportExcel = async () => {
    try {
      const result = await exportDataQuery.refetch();
      
      if (!result.data?.data || result.data.data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Transform data for Excel
      const excelData = result.data.data.map(row => ({
        'Sale Number': row.saleNumber,
        'Sale Date': new Date(row.saleDate).toLocaleDateString(),
        'Cashier': row.cashier,
        'Payment Method': row.paymentMethod,
        'Balance Account': row.balanceAccount,
        'Item Name': row.itemName,
        'Item Category': row.itemCategory,
        'Quantity': row.quantity,
        'Unit Price': row.unitPrice,
        'Item Subtotal': row.itemSubtotal,
        'Sale Subtotal': row.saleSubtotal,
        'Tax': row.tax,
        'Discount': row.discount,
        'Sale Total': row.saleTotal,
        'Amount Paid': row.amountPaid,
        'Change': row.change,
        'Notes': row.notes,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales History");
      
      // Generate filename with date range
      const fromDate = dateFrom ? new Date(dateFrom).toLocaleDateString() : 'All';
      const toDate = dateTo ? new Date(dateTo).toLocaleDateString() : 'All';
      const filename = `POS_Sales_${fromDate}_to_${toDate}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Exported ${result.data.data.length} records to ${filename}`);
    } catch (error) {
      toast.error("Failed to export data");
      console.error('Export error:', error);
    }
  };

  const handleSearch = () => {
    refetchSales();
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFilterPaymentMethod("");
    setFilterCashier("");
    setSearchTerm("");
    refetchSales();
  };

  // Filter summary data by payment method
  const filteredSummaryData = summaryData ? {
    ...summaryData,
    sales: summaryPaymentMethod && summaryPaymentMethod !== "all"
      ? summaryData.sales?.filter(sale => sale.paymentMethod === summaryPaymentMethod) || []
      : summaryData.sales || [],
    paymentMethods: summaryPaymentMethod && summaryPaymentMethod !== "all"
      ? Object.fromEntries(
          Object.entries(summaryData.paymentMethods || {})
            .filter(([method]) => method === summaryPaymentMethod)
        )
      : summaryData.paymentMethods || {},
    summary: summaryPaymentMethod && summaryPaymentMethod !== "all" ? {
      totalSales: summaryData.sales
        ?.filter(sale => sale.paymentMethod === summaryPaymentMethod)
        .reduce((sum, sale) => sum + sale.total, 0) || 0,
      totalTransactions: summaryData.sales
        ?.filter(sale => sale.paymentMethod === summaryPaymentMethod).length || 0,
      totalTax: summaryData.sales
        ?.filter(sale => sale.paymentMethod === summaryPaymentMethod)
        .reduce((sum, sale) => sum + sale.tax, 0) || 0,
      totalDiscount: summaryData.sales
        ?.filter(sale => sale.paymentMethod === summaryPaymentMethod)
        .reduce((sum, sale) => sum + sale.discount, 0) || 0,
    } : summaryData.summary,
    topItems: summaryPaymentMethod && summaryPaymentMethod !== "all" ?
      summaryData.sales
        ?.filter(sale => sale.paymentMethod === summaryPaymentMethod)
        .flatMap(sale => sale.items)
        .reduce((acc, saleItem) => {
          const key = saleItem.item.name;
          if (!acc[key]) {
            acc[key] = {
              name: saleItem.item.name,
              category: saleItem.item.category.name,
              quantity: 0,
              revenue: 0,
            };
          }
          acc[key].quantity += saleItem.quantity;
          acc[key].revenue += saleItem.subtotal;
          return acc;
        }, {} as Record<string, any>) ?
        Object.values(
          summaryData.sales
            ?.filter(sale => sale.paymentMethod === summaryPaymentMethod)
            .flatMap(sale => sale.items)
            .reduce((acc, saleItem) => {
              const key = saleItem.item.name;
              if (!acc[key]) {
                acc[key] = {
                  name: saleItem.item.name,
                  category: saleItem.item.category.name,
                  quantity: 0,
                  revenue: 0,
                };
              }
              acc[key].quantity += saleItem.quantity;
              acc[key].revenue += saleItem.subtotal;
              return acc;
            }, {} as Record<string, any>)
        ).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10) : []
      : summaryData.topItems || []
  } : null;

  // Calculate balance account totals
  const balanceAccountTotals = summaryData?.sales?.reduce((acc, sale) => {
    if (sale.balanceAccount) {
      const accountName = sale.balanceAccount.name;
      if (!acc[accountName]) {
        acc[accountName] = {
          name: accountName,
          cash: 0,
          digitalWallet: 0,
          card: 0,
          total: 0
        };
      }
      
      if (sale.paymentMethod === 'cash') {
        acc[accountName].cash += sale.total;
      } else if (sale.paymentMethod === 'digital_wallet') {
        acc[accountName].digitalWallet += sale.total;
      } else if (sale.paymentMethod === 'card') {
        acc[accountName].card += sale.total;
      }
      
      acc[accountName].total += sale.total;
    }
    return acc;
  }, {} as Record<string, any>) || {};

  return (
    <ProtectedRoute requiredPermissions={["create:pos-sale"]}>
      <div className="h-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground">
            Select items and process sales
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              New Sale
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Sales
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems?.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-medium truncate">{item.name}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-600">
                          {formatIDR(item.price)}
                        </span>
                        <div className="text-xs text-right">
                          <div className="font-medium">Showcase: {item.showcaseStock}</div>
                          <div className="text-muted-foreground">Warehouse: {item.warehouseStock}</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.category.name}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cartItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Cart is empty
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={item.itemId} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatIDR(item.price)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.itemId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatIDR(subtotal)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Tax:</span>
                        <Input
                          type="number"
                          value={tax}
                          onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Discount:</span>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                      </div>
                      
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>{formatIDR(total)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                        </SelectContent>
                      </Select>

                      {balanceAccounts && (
                        <Select
                          value={balanceAccountId?.toString()}
                          onValueChange={(value) => setBalanceAccountId(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select balance account" />
                          </SelectTrigger>
                          <SelectContent>
                            {balanceAccounts.items.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Input
                        type="number"
                        placeholder="Amount paid"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />

                      {parseFloat(amountPaid) >= total && (
                        <div className="text-center p-2 bg-green-50 rounded">
                          <span className="font-medium text-green-700">
                            Change: {formatIDR(change)}
                          </span>
                        </div>
                      )}

                      <Textarea
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={clearCart}
                          className="flex-1"
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={editingSale ? handleUpdateSale : handleCheckout}
                          className="flex-1 bg-infinity hover:bg-infinity/90"
                          disabled={cartItems.length === 0 || parseFloat(amountPaid) < total}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {editingSale ? "Update Sale" : "Checkout"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Sales
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      disabled={exportDataQuery.isLoading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentSales?.items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No recent sales found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentSales?.items.map((sale) => (
                      <Card key={sale.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{sale.saleNumber}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sale.saleDate).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Cashier: {sale.cashier?.name || "Unknown"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatIDR(sale.total)}</p>
                            <Badge variant="secondary">{sale.paymentMethod}</Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          {sale.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.item.name} x{item.quantity}</span>
                              <span>{formatIDR(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-sm text-muted-foreground mb-3">
                          <div>
                            <p>Subtotal: {formatIDR(sale.subtotal)}</p>
                            {sale.tax > 0 && <p>Tax: {formatIDR(sale.tax)}</p>}
                            {sale.discount > 0 && <p>Discount: {formatIDR(sale.discount)}</p>}
                            <p>Amount Paid: {formatIDR(sale.amountPaid)}</p>
                            <p>Change: {formatIDR(sale.change)}</p>
                          </div>
                        </div>

                        {sale.notes && (
                          <p className="text-sm text-muted-foreground mb-3">
                            Notes: {sale.notes}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSale(sale)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSale(sale.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    POS Summary
                  </div>
                </CardTitle>
                
                {/* Summary Filters */}
                <div className="mt-4 space-y-4 p-4  rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">From Date</label>
                      <Input
                        type="date"
                        value={summaryDateFrom}
                        onChange={(e) => setSummaryDateFrom(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">To Date</label>
                      <Input
                        type="date"
                        value={summaryDateTo}
                        onChange={(e) => setSummaryDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Method</label>
                      <Select value={summaryPaymentMethod} onValueChange={setSummaryPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="All payment methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All payment methods</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => refetchSummary()} variant="default">
                      Apply Filters
                    </Button>
                    <Button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0] || "";
                        setSummaryDateFrom(today);
                        setSummaryDateTo(today);
                        setSummaryPaymentMethod("all");
                        refetchSummary();
                      }}
                      variant="outline"
                    >
                      Reset to Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatIDR(filteredSummaryData?.summary?.totalSales || 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {filteredSummaryData?.summary?.totalTransactions || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Tax</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatIDR(filteredSummaryData?.summary?.totalTax || 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Discount</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatIDR(filteredSummaryData?.summary?.totalDiscount || 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Balance Account Totals */}
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Account Totals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.keys(balanceAccountTotals).length > 0 ? (
                        Object.values(balanceAccountTotals).map((account: any) => (
                          <div key={account.name} className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-3">{account.name}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Cash</p>
                                <p className="font-bold text-green-600">{formatIDR(account.cash)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Digital Wallet</p>
                                <p className="font-bold text-blue-600">{formatIDR(account.digitalWallet)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Card</p>
                                <p className="font-bold text-purple-600">{formatIDR(account.card)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="font-bold text-gray-800">{formatIDR(account.total)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No balance account data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredSummaryData?.paymentMethods && Object.keys(filteredSummaryData.paymentMethods).length > 0 ? (
                        Object.entries(filteredSummaryData.paymentMethods).map(([method, amount]) => (
                          <div key={method} className="flex justify-between items-center p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <Badge variant={method === 'cash' ? 'secondary' : method === 'digital_wallet' ? 'default' : 'outline'}>
                                {method === 'cash' ? 'Cash' : method === 'digital_wallet' ? 'Digital Wallet' : 'Card'}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatIDR(amount as number)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No payment data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Selling Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredSummaryData?.topItems && filteredSummaryData.topItems.length > 0 ? (
                        filteredSummaryData.topItems.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 border rounded">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">Qty: {item.quantity}</p>
                              <p className="text-sm text-green-600">{formatIDR(item.revenue)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No sales data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}