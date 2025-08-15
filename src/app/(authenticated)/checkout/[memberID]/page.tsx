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
  const [selectedVoucher, setSelectedVoucher] = useState<{
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
  } | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const selectedPackageDetails =
    subscriptionType === "gym"
      ? gymPackages?.find((p) => p.id === selectedPackage)
      : subscriptionType === "trainer"
      ? trainerPackages?.find((p) => p.id === selectedPackage)
      : groupPackages?.find((p) => p.id === selectedPackage);

  const calculateTotal = () => {
    if (!selectedPackageDetails) return 0;

    let total = selectedPackageDetails.price;
    if (selectedVoucher) {
      if (selectedVoucher.discountType === "PERCENT") {
        total = total - (total * selectedVoucher.amount) / 100;
      } else {
        total = total - selectedVoucher.amount;
      }
    }
    // Ensure total is not negative
    return Math.max(0, total);
  };

  const l = async () => {
    if (!selectedPackageDetails) {
      toast.error("Please select a package.");
      return;
    }
    if ((subscriptionType === "trainer" || subscriptionType === "group") && !hasActiveGymMembership) {
      toast.error("You need an active gym membership to purchase training sessions.");
      return;
    }
    if ((subscriptionType === "trainer" || subscriptionType === "group") && !selectedTrainer) {
      toast.error("Please select a personal trainer.");
      return;
    }

    // Calculate end date based on package type and day value
    const memberStartDate = new Date(startDate);
    const endDate = new Date(memberStartDate);

    // Add days to start date for both package types
    endDate.setDate(memberStartDate.getDate() + (selectedPackageDetails.day ?? 0));

    if (paymentMethod === "qris") {
      const queryParams = new URLSearchParams();
      queryParams.set("packageId", selectedPackage);
      queryParams.set("packageName", selectedPackageDetails.name);
      queryParams.set("packagePrice", selectedPackageDetails.price.toString());
      queryParams.set("packageType", subscriptionType);
      queryParams.set(
        "duration",
        subscriptionType === "gym"
          ? (selectedPackageDetails.day?.toString() ?? "0")
          : (selectedPackageDetails.sessions?.toString() ?? "0"),
      );
      if (subscriptionType === "trainer" || subscriptionType === "group") {
        queryParams.set(
          "sessions",
          selectedPackageDetails.sessions?.toString() ?? "0",
        );
      }
      queryParams.set("totalPayment", calculateTotal().toString());
      queryParams.set("paymentMethod", paymentMethod);
      if ((subscriptionType === "trainer" || subscriptionType === "group") && selectedTrainer) {
        queryParams.set("trainerId", selectedTrainer);
        const trainerInfo = trainers?.find((t) => t.id === selectedTrainer);
        if (trainerInfo?.user?.name) {
          queryParams.set("trainerName", trainerInfo.user.name);
        }
      }

      // Add sales information
      if (selectedSales) {
        const selectedSalesDetails = salesList?.find(s => s.id === selectedSales);
        queryParams.set("salesId", selectedSales);
        if (selectedSalesDetails) {
          queryParams.set("salesType", selectedSalesDetails.type);
          queryParams.set("salesName", selectedSalesDetails.name);
        }
      }

      if (selectedVoucher) {
        queryParams.set("voucherId", selectedVoucher.id);
        queryParams.set("voucherName", selectedVoucher.name);
        queryParams.set("voucherAmount", selectedVoucher.amount.toString());
        queryParams.set("voucherDiscountType", selectedVoucher.discountType);
      }

      toast.info("Proceeding to payment validation...");
      router.push(`/checkout/validate/${memberID}?${queryParams.toString()}`);
    } else {
      setIsProcessingPayment(true);
      try {
        // Create a unique order ID
        const orderId = `FIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Find selected sales person details
        const selectedSalesDetails = salesList?.find(s => s.id === selectedSales);
        
        // Create subscription record first (with pending status)
        const subscription = await createSubscriptionMutation.mutateAsync({
          memberId: memberID,
          packageId: selectedPackage,
          trainerId: (subscriptionType === "trainer" || subscriptionType === "group") ? selectedTrainer : undefined,
          salesId: selectedSales,
          salesType: selectedSalesDetails?.type,
          startDate: memberStartDate,
          subsType: subscriptionType,
          duration:
            subscriptionType === "gym"
              ? (selectedPackageDetails.day ?? 0)
              : (selectedPackageDetails.sessions ?? 0),
          paymentMethod: paymentMethod,
          totalPayment: calculateTotal(),
          status: "PENDING",
          orderReference: orderId,
        });

        // Format item details
          const itemDetails = [
            {
              id: selectedPackage,
              name: selectedPackageDetails.name,
              price: calculateTotal(),
              quantity: 1,
              sku: generateSKU(selectedPackageDetails.name),
              category: "services"
            },
        ];

        // Create the transaction with payment gateway
        const transactionResponse = await createPaymentMutation.mutateAsync({
          orderId,
          amount: calculateTotal(),
          subscriptionId: subscription.id,
          customerName: Member?.user?.name || "Member",
          customerEmail: Member?.user?.email || undefined,
          itemDetails,
          callbackUrl: `${window.location.origin}/checkout/confirmation/${memberID}?subscriptionId=${subscription.id}`,
          paymentGateway: paymentMethod,
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
                    await updatePaymentStatusMutation.mutateAsync({
                      orderReference: orderId,
                      status: "SUCCESS",
                      gatewayResponse: result,
                    });

                    toast.success("Payment successful!");
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
                      `/checkout/confirmation/${memberID}?subscriptionId=${subscription.id}&orderRef=${orderId}&status=SUCCESS`,
                    );
                  }
                },
                onPending: function (result: any) {
                  toast.info("Payment pending, waiting for confirmation");
                  router.push(
                    `/checkout/confirmation/${memberID}?subscriptionId=${subscription.id}&orderRef=${orderId}&status=PENDING`,
                  );
                },
                onError: function (result: any) {
                  updatePaymentStatusMutation
                    .mutateAsync({
                      orderReference: orderId,
                      status: "FAILED",
                      gatewayResponse: result,
                    })
                    .catch(console.error);
                  toast.error("Payment failed");
                  console.error(result);
                  router.push(
                    `/checkout/confirmation/${memberID}?subscriptionId=${subscription.id}&orderRef=${orderId}&status=FAILED`,
                  );
                },
                onClose: function () {
                  toast.info(
                    "Payment window closed, transaction may still be processing",
                  );
                  router.push(
                    `/checkout/confirmation/${memberID}?subscriptionId=${subscription.id}&orderRef=${orderId}`,
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
        toast.error(
          error instanceof Error ? error.message : "Payment process failed",
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
                    {selectedVoucher ? (
                      <div className="flex w-full items-center justify-between">
                        <span>
                          {selectedVoucher.name} (
                          {selectedVoucher.discountType === "PERCENT"
                            ? `${selectedVoucher.amount}% off`
                            : `Rp ${selectedVoucher.amount.toLocaleString()} off`}
                          )
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
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      This is when your membership will be activated and start counting. You can choose to start today or schedule it for a future date.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-medium">Order Summary</h3>
                  <div className="space-y-2">
                    {selectedPackageDetails ? (
                      <>
                        <div className="flex justify-between">
                          <span>Subscription:</span>
                          <span>
                            {subscriptionType === "gym"
                              ? "Gym Membership"
                              : subscriptionType === "trainer"
                              ? "Personal Training"
                              : "Group Training"}
                          </span>
                        </div>

                        {(subscriptionType === "trainer" || subscriptionType === "group") && selectedTrainer && (
                          <div className="flex justify-between">
                            <span>Trainer:</span>
                            <span>
                              {
                                trainers?.find((t) => t.id === selectedTrainer)
                                  ?.user?.name
                              }
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span>Package:</span>
                          <span>
                            {selectedPackageDetails.name}
                            {subscriptionType === "group" && selectedPackageDetails.isGroupPackage && (
                              <span className="text-sm text-muted-foreground block">
                                Max {selectedPackageDetails.maxUsers} people
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>
                            Rp{" "}
                            {selectedPackageDetails.price.toLocaleString(
                              "id-ID",
                            )}
                            {subscriptionType === "group" && selectedPackageDetails.isGroupPackage && selectedPackageDetails.groupPriceType === "TOTAL" && (
                              <span className="text-sm text-muted-foreground block">
                                (to be split among group)
                              </span>
                            )}
                          </span>
                        </div>

                        {selectedVoucher && (
                          <>
                            <div className="flex justify-between text-green-600">
                              <span>Discount:</span>
                              <span>
                                {selectedVoucher.discountType === "PERCENT"
                                  ? `${selectedVoucher.amount}%`
                                  : `Rp ${selectedVoucher.amount.toLocaleString()}`}
                              </span>
                            </div>
                          </>
                        )}

                        <Separator className="my-2" />

                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>
                            Rp {calculateTotal().toLocaleString("id-ID")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        Select a package to see the summary
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-infinity"
                  disabled={
                    !selectedPackageDetails ||
                   
                    ((subscriptionType === "trainer" || subscriptionType === "group") && !selectedTrainer) ||
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
        onVoucherApplied={(voucher) =>
          setSelectedVoucher(voucher.id ? voucher : null)
        }
        currentVoucher={selectedVoucher || undefined}
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