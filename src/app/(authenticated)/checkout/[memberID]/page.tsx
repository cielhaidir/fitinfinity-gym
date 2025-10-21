// src/app/(authenticated)/checkout/[memberID]/page.tsx

"use client";

import { useState, use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, QrCode, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VoucherModal } from "./voucherModal";

// Cart item type for multi-item checkout
interface CartItem {
  type: "gym" | "trainer" | "group";
  packageId: string;
  trainerId?: string;
  name: string;
  price: number;
  day?: number;
  sessions?: number;
}

export default function SubscriptionPage({
  params,
}: {
  params: Promise<{ memberID: string }>;
}) {
  const { memberID } = use(params);
  const router = useRouter();
  const utils = api.useUtils();
  const { data: Member } = api.member.getById.useQuery({ id: memberID });
  const { data: gymPackages } = api.package.listByType.useQuery({
    type: "GYM_MEMBERSHIP",
  });
  const { data: trainerPackages } = api.package.listByType.useQuery({
    type: "PERSONAL_TRAINER",
  });
  const { data: groupPackages } = api.package.listByType.useQuery({
    type: "GROUP_TRAINING",
  });
  const { data: trainers } = api.personalTrainer.listAll.useQuery();
  const { data: salesList } = api.subs.getSalesList.useQuery();

  // Check for active gym membership
  const { data: memberSubscriptions } = api.subs.getByIdMember.useQuery({
    memberId: memberID,
    page: 1,
    limit: 100, // Get all subscriptions to check for active ones
  });

  // Check if member has active gym membership
  // const hasActiveGymMembership = memberSubscriptions?.items?.some(subscription => {
  //   // Check if it's a gym membership package
  //   const isGymMembership = subscription.package.type === "GYM_MEMBERSHIP";
  //   // Check if it's currently active (not expired)
  //   const isActive = subscription.endDate ? new Date(subscription.endDate) > new Date() : false;
  //   // Check if payment is successful
  //   const isPaid = subscription.payments?.some(payment => payment.status === "SUCCESS");
    
  //   return isGymMembership && isActive && isPaid;
  // }) ?? false;

  const hasActiveGymMembership = true;

  const [subscriptionType, setSubscriptionType] = useState<"gym" | "trainer" | "group">(
    "gym",
  );
  // Reset subscription type to gym if no active membership and currently on trainer
  useEffect(() => {
    if (!hasActiveGymMembership && (subscriptionType === "trainer" || subscriptionType === "group")) {
      setSubscriptionType("gym");
      setSelectedPackage("");
      setSelectedTrainer("");
    }
  }, [hasActiveGymMembership, subscriptionType]);

  const createSubscriptionMutation = api.subs.create.useMutation();
  const createPaymentMutation = api.payment.createTransaction.useMutation();
  const updatePaymentStatusMutation =
    api.subs.updatePaymentStatus.useMutation();

  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [selectedSales, setSelectedSales] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVouchers, setSelectedVouchers] = useState<{
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
    minimumPurchase?: number | null;
    allowStack?: boolean;
  }[]>([]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0] || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Cart state for multi-item checkout
  const [cart, setCart] = useState<CartItem[]>([]);

  const selectedPackageDetails =
    subscriptionType === "gym"
      ? gymPackages?.find((p) => p.id === selectedPackage)
      : subscriptionType === "trainer"
      ? trainerPackages?.find((p) => p.id === selectedPackage)
      : groupPackages?.find((p) => p.id === selectedPackage);

  // Cart helper functions
  const addToCart = (item: CartItem) => {
    // Prevent duplicate gym membership
    if (item.type === "gym" && cart.some(cartItem => cartItem.type === "gym")) {
      toast.error("Only one gym membership can be added to cart");
      return;
    }
    
    // Prevent duplicate items (same package and trainer combination)
    const isDuplicate = cart.some(cartItem =>
      cartItem.packageId === item.packageId &&
      cartItem.trainerId === item.trainerId
    );
    
    if (isDuplicate) {
      toast.error("This package is already in your cart");
      return;
    }
    
    setCart(prev => [...prev, item]);
    toast.success(`${item.name} added to cart`);
    
    // Clear current selections
    setSelectedPackage("");
    setSelectedTrainer("");
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    toast.success("Item removed from cart");
  };

  // Calculate cart subtotal
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  // Calculate total with vouchers applied to cart subtotal
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return 0;

    let total = subtotal;
    
    // Apply all vouchers to the cart subtotal
    selectedVouchers.forEach(voucher => {
      // Check minimum purchase requirement against subtotal
      if (!voucher.minimumPurchase || subtotal >= voucher.minimumPurchase) {
        if (voucher.discountType === "PERCENT") {
          total = total - (total * voucher.amount) / 100;
        } else {
          total = total - voucher.amount;
        }
      }
    });
    
    // Ensure total is not negative
    return Math.max(0, total);
  };

  const l = async () => {
    // Validate cart
    if (cart.length === 0) {
      toast.error("Please add at least one package to your cart.");
      return;
    }

    // Check if any trainer/group items exist and validate gym membership requirement
    const hasTrainerOrGroup = cart.some(item => item.type === "trainer" || item.type === "group");
    if (hasTrainerOrGroup && !hasActiveGymMembership) {
      toast.error("You need an active gym membership to purchase training sessions.");
      return;
    }

    // Validate that trainer/group items have trainerId
    const invalidTrainerItems = cart.filter(item =>
      (item.type === "trainer" || item.type === "group") && !item.trainerId
    );
    if (invalidTrainerItems.length > 0) {
      toast.error("Please select a trainer for all training packages.");
      return;
    }

    const memberStartDate = new Date(startDate);

    if (paymentMethod === "qris") {
      const queryParams = new URLSearchParams();
      
      // Send cart data for multi-item support
      const cartData = cart.map(item => ({
        type: item.type,
        packageId: item.packageId,
        name: item.name,
        price: item.price,
        trainerId: item.trainerId,
        sessions: item.sessions,
        day: item.day
      }));
      
      queryParams.set("cart", encodeURIComponent(JSON.stringify(cartData)));
      queryParams.set("totalPayment", calculateTotal().toString());
      queryParams.set("paymentMethod", paymentMethod);

      // Add sales information
      if (selectedSales) {
        const selectedSalesDetails = salesList?.find(s => s.id === selectedSales);
        queryParams.set("salesId", selectedSales);
        if (selectedSalesDetails) {
          queryParams.set("salesType", selectedSalesDetails.type);
          queryParams.set("salesName", selectedSalesDetails.name);
        }
      }

      // Keep first voucher for backward compatibility
      if (selectedVouchers.length > 0) {
        const firstVoucher = selectedVouchers[0];
        if (firstVoucher) {
          queryParams.set("voucherId", firstVoucher.id);
          queryParams.set("voucherName", firstVoucher.name);
          queryParams.set("voucherAmount", firstVoucher.amount.toString());
          queryParams.set("voucherDiscountType", firstVoucher.discountType);
        }
      }

      toast.info("Proceeding to payment validation...");
      router.push(`/checkout/validate/${memberID}?${queryParams.toString()}`);
    } else {
      setIsProcessingPayment(true);
      const createdSubscriptions: string[] = [];
      
      // Create a unique order ID for all subscriptions (moved outside try block for scope)
      const orderId = `FIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      try {

        // Find selected sales person details
        const selectedSalesDetails = salesList?.find(s => s.id === selectedSales);
        
        // Create subscription records for each cart item (with pending status)
        // Use Promise.all for better performance but handle individual failures
        const subscriptionPromises = cart.map(async (item) => {
          try {
            const subscription = await createSubscriptionMutation.mutateAsync({
              memberId: memberID,
              packageId: item.packageId,
              trainerId: item.trainerId,
              salesId: selectedSales,
              salesType: selectedSalesDetails?.type,
              startDate: memberStartDate,
              subsType: item.type,
              duration: item.type === "gym" ? (item.day ?? 0) : (item.sessions ?? 0),
              paymentMethod: paymentMethod,
              totalPayment: item.price, // Keep full package price
              status: "PENDING",
              orderReference: orderId,
            });
            
            return { success: true as const, id: subscription.id, item };
          } catch (error) {
            console.error(`Failed to create subscription for ${item.name}:`, error);
            return { success: false as const, error, item };
          }
        });

        const subscriptionResults = await Promise.all(subscriptionPromises);
        const successfulSubscriptions = subscriptionResults.filter((result): result is { success: true; id: string; item: CartItem } => result.success);
        const failedSubscriptions = subscriptionResults.filter(result => !result.success);

        if (failedSubscriptions.length > 0) {
          const failedItems = failedSubscriptions.map(result => result.item.name).join(", ");
          throw new Error(`Failed to create subscriptions for: ${failedItems}`);
        }

        // Collect successful subscription IDs
        successfulSubscriptions.forEach(result => {
          createdSubscriptions.push(result.id);
        });

        if (createdSubscriptions.length === 0) {
          throw new Error("No subscriptions were created successfully");
        }

        // Get primary subscription (first one) for payment gateway
        const primarySubscriptionId = createdSubscriptions[0];

        // Calculate discount amounts
        const originalSubtotal = calculateSubtotal();
        const discountedCartSubtotal = calculateTotal(); // This is cart total with voucher discounts applied
        const discountFactor = originalSubtotal > 0 ? discountedCartSubtotal / originalSubtotal : 1;
        
        // Apply discount to cart items: amount = amount - discount
        const discountedCartItems = cart.map(item => ({
          id: item.packageId,
          name: `${item.name} (${item.type === "gym" ? "Gym" : item.type === "trainer" ? "PT" : "Group"})`,
          price: Math.round(item.price * discountFactor), // Original amount - discount
          quantity: 1,
          sku: generateSKU(item.name),
          category: "services"
        }));

        // Calculate discounted subtotal
        const discountedSubtotal = discountedCartItems.reduce((sum, item) => sum + item.price, 0);
        
        // Then add service fees on top of discounted amount
        const itemDetails = [...discountedCartItems];
        
        if (originalSubtotal > 0) {
          // Add 5% service fee on discounted amount
          const serviceFee = Math.round(discountedSubtotal * 0.05);
          itemDetails.push({
            id: "service-fee",
            name: "Service Fee 5%",
            price: serviceFee,
            quantity: 1,
            sku: "SRV-5PCT",
            category: "service"
          });

          // Add fixed admin fee
          const adminFee = 2000;
          itemDetails.push({
            id: "admin-fee",
            name: "Admin Fee",
            price: adminFee,
            quantity: 1,
            sku: "ADMIN-FEE",
            category: "service"
          });
        }

        // Calculate total amount including fees (this should match line items sum)
        const totalAmountWithFees = itemDetails.reduce((sum, item) => sum + item.price, 0);

        // Create the transaction with payment gateway
        const transactionResponse = await createPaymentMutation.mutateAsync({
          orderId,
          amount: totalAmountWithFees, // Use total that includes all fees to match line items
          subscriptionId: primarySubscriptionId ?? "",
          customerName: Member?.user?.name || "Member",
          customerEmail: Member?.user?.email || undefined,
          itemDetails,
          callbackUrl: `${window.location.origin}/checkout/confirmation/${memberID}?subscriptionId=${primarySubscriptionId}`,
          paymentGateway: paymentMethod as "midtrans" | "doku" | "shopee" | "kredivo" | "akulaku" | "qr" | undefined,
        });

        if (transactionResponse.redirect_url) {
          if (paymentMethod === "midtrans") {
            // For Midtrans, load Snap.js when needed
            const snapScript = document.createElement("script");
            snapScript.src = process.env.NEXT_PUBLIC_SNAP || "https://app.sandbox.midtrans.com/snap/snap.js";
            snapScript.setAttribute(
              "data-client-key",
              process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
            );
            document.body.appendChild(snapScript);

            snapScript.onload = () => {
              // @ts-ignore - window.snap is from the loaded script
              window.snap.pay(transactionResponse.token, {
                onSuccess: async function (result: any) {
                  try {
                    // Update status for all created subscriptions with better error handling
                    const updatePromises = createdSubscriptions.map(async (subscriptionId) => {
                      try {
                        await updatePaymentStatusMutation.mutateAsync({
                          orderReference: orderId,
                          status: "SUCCESS",
                          gatewayResponse: result,
                        });
                        return { success: true, subscriptionId };
                      } catch (error) {
                        console.error(`Failed to update subscription ${subscriptionId}:`, error);
                        return { success: false, error, subscriptionId };
                      }
                    });

                    const updateResults = await Promise.all(updatePromises);
                    const failedUpdates = updateResults.filter(result => !result.success);

                    if (failedUpdates.length > 0) {
                      console.warn(`${failedUpdates.length} subscription updates failed`);
                      toast.warning("Payment successful, but some subscriptions may need manual verification");
                    } else {
                      toast.success("Payment successful!");
                    }

                    await utils.subs.getByIdMember.invalidate({
                      memberId: memberID,
                    });
                    router.push(`/member/payment-history`);
                  } catch (error) {
                    console.error("Error updating payment status:", error);
                    toast.error(
                      "Payment was processed but there was an error updating your subscription",
                    );
                    router.push(
                      `/checkout/confirmation/${memberID}?subscriptionId=${primarySubscriptionId}&orderRef=${orderId}&status=SUCCESS`,
                    );
                  }
                },
                onPending: function (result: any) {
                  // Update status for all created subscriptions
                  createdSubscriptions.forEach(async (subscriptionId) => {
                    try {
                      await updatePaymentStatusMutation.mutateAsync({
                        orderReference: orderId,
                        status: "PENDING",
                        gatewayResponse: result,
                      });
                    } catch (error) {
                      console.error("Error updating pending status:", error);
                    }
                  });
                  
                  toast.info("Payment pending, waiting for confirmation");
                  router.push(
                    `/checkout/confirmation/${memberID}?subscriptionId=${primarySubscriptionId}&orderRef=${orderId}&status=PENDING`,
                  );
                },
                onError: function (result: any) {
                  // Update status for all created subscriptions
                  createdSubscriptions.forEach(async (subscriptionId) => {
                    try {
                      await updatePaymentStatusMutation.mutateAsync({
                        orderReference: orderId,
                        status: "FAILED",
                        gatewayResponse: result,
                      });
                    } catch (error) {
                      console.error("Error updating failed status:", error);
                    }
                  });
                  
                  toast.error("Payment failed");
                  console.error(result);
                  router.push(
                    `/checkout/confirmation/${memberID}?subscriptionId=${primarySubscriptionId}&orderRef=${orderId}&status=FAILED`,
                  );
                },
                onClose: function () {
                  toast.info(
                    "Payment window closed, transaction may still be processing",
                  );
                  router.push(
                    `/checkout/confirmation/${memberID}?subscriptionId=${primarySubscriptionId}&orderRef=${orderId}`,
                  );
                },
              });
            };
          } else {
            // For Doku, Shopee, Kredivo, Akulaku - redirect directly to the payment URL
            window.location.href = transactionResponse.redirect_url;
          }
        } else {
          toast.error("Failed to initialize payment");
        }
      } catch (error) {
        // If subscription creation failed, clean up any partially created subscriptions
        console.error("Subscription creation failed:", error);
        
        // If we have any created subscriptions, we should mark them as failed
        if (createdSubscriptions.length > 0) {
          try {
            // Update status to FAILED for any subscriptions that were created
            await Promise.allSettled(
              createdSubscriptions.map(subscriptionId =>
                updatePaymentStatusMutation.mutateAsync({
                  orderReference: orderId,
                  status: "FAILED",
                  gatewayResponse: { error: "Subscription creation failed" },
                })
              )
            );
          } catch (cleanupError) {
            console.error("Failed to cleanup partial subscriptions:", cleanupError);
          }
        }
        
        toast.error(
          error instanceof Error ? error.message : "Failed to create subscriptions",
        );
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  return (
    <>
      <div className="container mx-auto p-5">
        <h1 className="text-3xl font-bold">Subscription Checkout</h1>
        <p className="mb-6 mt-1 text-muted-foreground">
          Member: {Member?.user?.name}
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle>Choose Subscription Type</CardTitle>
                <CardDescription>
                  Select the type of subscription you want
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  defaultValue="gym"
                  onValueChange={(value) => {
                    // Only allow switching to trainer/group if member has active gym membership
                    if ((value === "trainer" || value === "group") && !hasActiveGymMembership) {
                      return;
                    }
                    setSubscriptionType(value as "gym" | "trainer" | "group");
                    setSelectedPackage("");
                    setSelectedTrainer("");
                  }}
                >
           <TabsList className={`grid w-full ${hasActiveGymMembership ? 'grid-cols-3' : 'grid-cols-1'}`}>
  <TabsTrigger value="gym">
    <span className="hidden sm:inline">Gym Membership</span>
    <span className="sm:hidden">Gym</span>
  </TabsTrigger>
  {hasActiveGymMembership && (
    <TabsTrigger value="trainer">
      <span className="hidden sm:inline">Personal Trainer</span>
      <span className="sm:hidden">Trainer</span>
    </TabsTrigger>
  )}
  {hasActiveGymMembership && (
    <TabsTrigger value="group">
      <span className="hidden sm:inline">Group Training</span>
      <span className="sm:hidden">Group</span>
    </TabsTrigger>
  )}
</TabsList>
                  {!hasActiveGymMembership && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Personal Trainer sessions and Group Training require an active gym membership.
                        Please purchase a gym membership first to access these services.
                      </p>
                    </div>
                  )}
                  
                  <TabsContent value="gym" className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="mb-3 text-lg font-medium">
                          Select Gym Package
                        </h3>
                        <RadioGroup
                          value={selectedPackage}
                          onValueChange={setSelectedPackage}
                        >
                          <div className="grid grid-cols-1 gap-4">
                            {gymPackages?.map((pkg) => (
                              <div
                                key={pkg.id}
                                className="flex items-center space-x-2"
                              >
                                <RadioGroupItem value={pkg.id} id={pkg.id} />
                                <Label
                                  htmlFor={pkg.id}
                                  className="flex flex-1 justify-between items-start"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {pkg.name} ({pkg.day} Days)
                                    </span>
                                    {pkg.description && (
                                      <span className="text-sm text-muted-foreground mt-1">
                                        {pkg.description}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-semibold">
                                    Rp {pkg.price.toLocaleString("id-ID")}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                        
                        {selectedPackage && selectedPackageDetails && (
                          <Button
                            onClick={() => {
                              addToCart({
                                type: "gym",
                                packageId: selectedPackage,
                                name: selectedPackageDetails.name,
                                price: selectedPackageDetails.price,
                                day: selectedPackageDetails.day || undefined,
                              });
                            }}
                            className="mt-4 w-full"
                            variant="outline"
                          >
                            Add to Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="trainer" className="pt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-3 text-lg font-medium">
                          Select Personal Trainer
                        </h3>
                        <Select
                          value={selectedTrainer}
                          onValueChange={setSelectedTrainer}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a trainer" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainers?.length ? (
                              trainers.map((trainer) => (
                                <SelectItem key={trainer.id} value={trainer.id}>
                                  {trainer?.user?.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem disabled value="no data">
                                No data
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTrainer && (
                        <div>
                          <h3 className="mb-3 text-lg font-medium">
                            Select Training Package
                          </h3>
                          <RadioGroup
                            value={selectedPackage}
                            onValueChange={setSelectedPackage}
                          >
                            <div className="grid grid-cols-1 gap-4">
                              {trainerPackages?.map((pkg) => (
                                <div
                                  key={pkg.id}
                                  className="flex items-center space-x-2"
                                >
                                  <RadioGroupItem value={pkg.id} id={pkg.id} />
                                  <Label
                                    htmlFor={pkg.id}
                                    className="flex flex-1 justify-between items-start"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {pkg.name} ({pkg.sessions} sessions)
                                      </span>
                                      {pkg.description && (
                                        <span className="text-sm text-muted-foreground mt-1">
                                          {pkg.description}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold">
                                      Rp {pkg.price.toLocaleString("id-ID")}
                                    </span>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                          
                          {selectedPackage && selectedPackageDetails && selectedTrainer && (
                            <Button
                              onClick={() => {
                                addToCart({
                                  type: "trainer",
                                  packageId: selectedPackage,
                                  trainerId: selectedTrainer,
                                  name: selectedPackageDetails.name,
                                  price: selectedPackageDetails.price,
                                  sessions: selectedPackageDetails.sessions || undefined,
                                });
                              }}
                              className="mt-4 w-full"
                              variant="outline"
                            >
                              Add to Order
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="group" className="pt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-3 text-lg font-medium">
                          Select Personal Trainer
                        </h3>
                        <Select
                          value={selectedTrainer}
                          onValueChange={setSelectedTrainer}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a trainer" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainers?.length ? (
                              trainers.map((trainer) => (
                                <SelectItem key={trainer.id} value={trainer.id}>
                                  {trainer?.user?.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem disabled value="no data">
                                No data
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTrainer && (
                        <div>
                          <h3 className="mb-3 text-lg font-medium">
                            Select Group Training Package
                          </h3>
                          <RadioGroup
                            value={selectedPackage}
                            onValueChange={setSelectedPackage}
                          >
                            <div className="grid grid-cols-1 gap-4">
                              {groupPackages?.map((pkg) => (
                                <div
                                  key={pkg.id}
                                  className="flex items-center space-x-2"
                                >
                                  <RadioGroupItem value={pkg.id} id={pkg.id} />
                                  <Label
                                    htmlFor={pkg.id}
                                    className="flex flex-1 justify-between items-start"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {pkg.name} ({pkg.sessions} sessions)
                                      </span>
                                      {pkg.description && (
                                        <span className="text-sm text-muted-foreground mt-1">
                                          {pkg.description}
                                        </span>
                                      )}
                                      {pkg.isGroupPackage && (
                                        <span className="text-sm text-muted-foreground mt-1">
                                          <Users className="inline h-3 w-3 mr-1" />
                                          Max {pkg.maxUsers} people • {pkg.groupPriceType === "TOTAL" ? "Split cost" : "Per person"}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold">
                                      Rp {pkg.price.toLocaleString("id-ID")}
                                      {pkg.isGroupPackage && pkg.groupPriceType === "TOTAL" && (
                                        <span className="text-sm text-muted-foreground block">
                                          (split among group)
                                        </span>
                                      )}
                                    </span>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                          
                          {selectedPackage && selectedPackageDetails && selectedTrainer && (
                            <Button
                              onClick={() => {
                                addToCart({
                                  type: "group",
                                  packageId: selectedPackage,
                                  trainerId: selectedTrainer,
                                  name: selectedPackageDetails.name,
                                  price: selectedPackageDetails.price,
                                  sessions: selectedPackageDetails.sessions || undefined,
                                });
                              }}
                              className="mt-4 w-full"
                              variant="outline"
                            >
                              Add to Order
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Sales Selection Card */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle>Sales Assignment</CardTitle>
                <CardDescription>
                  Select the sales person for commission tracking (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <h3 className="mb-3 text-lg font-medium">Select Sales Person</h3>
                  <Select
                    value={selectedSales}
                    onValueChange={setSelectedSales}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sales person" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesList?.length ? (
                        salesList.map((sales) => (
                          <SelectItem key={sales.id} value={sales.id}>
                            {sales.name} ({sales.typeName})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="no data">
                          No sales people available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Complete your subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-3 text-lg font-medium">Payment Method</h3>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-1 gap-3"
                  >
                    {/* <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="midtrans" id="midtrans" />
                      <Label
                        htmlFor="midtrans"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Online (Card/E-Wallet)
                      </Label>
                    </div> */}
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="doku" id="doku" />
                      <Label
                        htmlFor="doku"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Doku Pay (Digital Credit Card/E-Wallet)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="qris" id="qris" />
                      <Label htmlFor="qris" className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        QR Offline (Pay at the Gym)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3 opacity-50 cursor-not-allowed">
                      <RadioGroupItem value="shopee" id="shopee" disabled />
                      <Label
                      htmlFor="shopee"
                      className="flex items-center gap-2"
                      >
                      <CreditCard className="h-4 w-4" />
                      ShopeePay / PayLater (Coming Soon) 
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3 opacity-50 cursor-not-allowed ">
                      <RadioGroupItem value="kredivo" id="kredivo" disabled/>
                      <Label
                        htmlFor="kredivo"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Kredivo (Coming Soon)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3  opacity-50 cursor-not-allowed">
                      <RadioGroupItem value="akulaku" id="akulaku" disabled/>
                      <Label
                        htmlFor="akulaku"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Akulaku (Coming Soon)
                      </Label>
                    </div>
                    {/* <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="qr" id="qr" />
                      <Label htmlFor="qr" className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        QR Online
                      </Label>
                    </div> */}

                  </RadioGroup>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-medium">Voucher</h3>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsVoucherModalOpen(true)}
                  >
                    {selectedVouchers.length > 0 ? (
                      <div className="flex w-full items-center justify-between">
                        <span>
                          {selectedVouchers.length === 1
                            ? `${selectedVouchers[0]?.name} (${
                                selectedVouchers[0]?.discountType === "PERCENT"
                                  ? `${selectedVouchers[0]?.amount}% off`
                                  : `Rp ${selectedVouchers[0]?.amount?.toLocaleString()} off`
                              })`
                            : `${selectedVouchers.length} vouchers applied`}
                        </span>
                        <span className="text-green-600">Applied</span>
                      </div>
                    ) : (
                      "Apply Voucher"
                    )}
                  </Button>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-medium">Start Date</h3>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Your membership start date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
            
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      This is when your membership will be activated and start counting. You can choose to start today or schedule it for a future date.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-medium">Cart Summary</h3>
                  <div className="space-y-2">
                    {cart.length > 0 ? (
                      <>
                        {/* Cart Items */}
                        <div className="space-y-3 mb-4">
                          {cart.map((item, index) => (
                            <div key={index} className="border rounded-md p-3 ">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {item.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {item.type === "gym"
                                      ? `Gym Membership (${item.day} days)`
                                      : item.type === "trainer"
                                      ? `Personal Training (${item.sessions} sessions)`
                                      : `Group Training (${item.sessions} sessions)`
                                    }
                                  </div>
                                  {item.trainerId && (
                                    <div className="text-sm text-muted-foreground">
                                      Trainer: {trainers?.find(t => t.id === item.trainerId)?.user?.name}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    Rp {item.price.toLocaleString("id-ID")}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromCart(index)}
                                    className="text-red-500 hover:text-red-700 mt-1"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pricing Summary */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>Rp {calculateSubtotal().toLocaleString("id-ID")}</span>
                          </div>

                          {selectedVouchers.length > 0 && (
                            <>
                              {selectedVouchers.map((voucher, index) => (
                                <div key={voucher.id} className="flex justify-between text-green-600">
                                  <span>
                                    {selectedVouchers.length > 1 ? `Voucher ${index + 1}:` : "Discount:"}
                                  </span>
                                  <span>
                                    -{voucher.discountType === "PERCENT"
                                      ? `${voucher.amount}%`
                                      : `Rp ${voucher.amount.toLocaleString()}`}
                                  </span>
                                </div>
                              ))}
                            </>
                          )}

                          <Separator className="my-2" />

                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span>
                              Rp {calculateTotal().toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        Add packages to your cart to see the summary
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-infinity"
                  disabled={
                    cart.length === 0 ||
                    isProcessingPayment
                  }
                  onClick={l}
                >
                    {isProcessingPayment
                    ? "Processing..."
                    : paymentMethod === "qris"
                      ? "Proceed to Upload Bukti Bayar"
                      : paymentMethod === "qr"
                      ? "Pay with QR Online"
                      : paymentMethod === "shopee"
                      ? "Pay with ShopeePay"
                      : paymentMethod === "kredivo"
                        ? "Pay with Kredivo"
                        : paymentMethod === "akulaku"
                        ? "Pay with Akulaku"
                        : "Pay Now"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        onVoucherApplied={(vouchers) => setSelectedVouchers(vouchers)}
        currentVouchers={selectedVouchers}
        packagePrice={calculateSubtotal()}
      />
    </>
  );
}

function generateSKU(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')  // Ubah spasi & simbol ke "-"
    .replace(/^-+|-+$/g, '')     // Hapus "-" di awal/akhir
    .slice(0, 30);               // Biar gak kepanjangan (maksimal 30 karakter)
}