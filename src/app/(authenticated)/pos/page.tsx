"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart, Trash2, CreditCard } from "lucide-react";
import type { POSSaleItem } from "./schema";

export default function POSPage() {
  const [cartItems, setCartItems] = useState<POSSaleItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [balanceAccountId, setBalanceAccountId] = useState<number | undefined>();
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [tax, setTax] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const { data: categories } = api.posCategory.getAll.useQuery();
  const { data: items } = api.posItem.getAll.useQuery();
  const { data: balanceAccounts } = api.balanceAccount.getAll.useQuery({});
  const createSaleMutation = api.posSale.create.useMutation();

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
    };

    toast.promise(promise, {
      loading: "Processing sale...",
      success: "Sale completed successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  };

  return (
    <ProtectedRoute requiredPermissions={["create:pos-sale"]}>
      <div className="h-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground">
            Select items and process sales
          </p>
        </div>

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
                          Rp. {item.price.toFixed(2)}
                        </span>
                        <Badge variant={item.stock > 0 ? "secondary" : "destructive"}>
                          {item.stock} left
                        </Badge>
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
                              Rp. {item.price.toFixed(2)} each
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
                        <span>Rp. {subtotal.toFixed(2)}</span>
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
                        <span>Rp. {total.toFixed(2)}</span>
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
                            Change: RP{change.toFixed(2)}
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
                          onClick={handleCheckout}
                          className="flex-1 bg-infinity hover:bg-infinity/90"
                          disabled={cartItems.length === 0 || parseFloat(amountPaid) < total}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Checkout
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}