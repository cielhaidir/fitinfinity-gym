"use client";

import { useState, use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, QrCode } from "lucide-react";

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
  const { data: trainers } = api.personalTrainer.listAll.useQuery();
  
  // Check for active gym membership
  const { data: memberSubscriptions } = api.subs.getByIdMember.useQuery({
    memberId: memberID,
    page: 1,
    limit: 100, // Get all subscriptions to check for active ones
  });

  // Check if member has active gym membership
  const hasActiveGymMembership = memberSubscriptions?.items?.some(subscription => {
    // Check if it's a gym membership package
    const isGymMembership = subscription.package.type === "GYM_MEMBERSHIP";
    // Check if it's currently active (not expired)
    const isActive = subscription.endDate ? new Date(subscription.endDate) > new Date() : false;
    // Check if payment is successful
    const isPaid = subscription.payments?.some(payment => payment.status === "SUCCESS");
    
    return isGymMembership && isActive && isPaid;
  }) ?? false;

  const [subscriptionType, setSubscriptionType] = useState<"gym" | "trainer">(
    "gym",
  );
  // Reset subscription type to gym if no active membership and currently on trainer
  useEffect(() => {
    if (!hasActiveGymMembership && subscriptionType === "trainer") {
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
  const [paymentMethod, setPaymentMethod] = useState("midtrans");
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<{
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const selectedPackageDetails =
    subscriptionType === "gym"
      ? gymPackages?.find((p) => p.id === selectedPackage)
      : trainerPackages?.find((p) => p.id === selectedPackage);

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

  const handleSubmit = async () => {
    if (!selectedPackageDetails) {
      toast.error("Please select a package.");
      return;
    }
    if (subscriptionType === "trainer" && !hasActiveGymMembership) {
      toast.error("You need an active gym membership to purchase personal training sessions.");
      return;
    }
    if (subscriptionType === "trainer" && !selectedTrainer) {
      toast.error("Please select a personal trainer.");
      return;
    }

    // Calculate end date based on package type and day value
    const startDate = new Date();
    const endDate = new Date(startDate);

    // Add days to start date for both package types
    endDate.setDate(startDate.getDate() + (selectedPackageDetails.day ?? 0));

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
      if (subscriptionType === "trainer") {
        queryParams.set(
          "sessions",
          selectedPackageDetails.sessions?.toString() ?? "0",
        );
      }
      queryParams.set("totalPayment", calculateTotal().toString());
      queryParams.set("paymentMethod", paymentMethod);
      if (subscriptionType === "trainer" && selectedTrainer) {
        queryParams.set("trainerId", selectedTrainer);
        const trainerInfo = trainers?.find((t) => t.id === selectedTrainer);
        if (trainerInfo?.user?.name) {
          queryParams.set("trainerName", trainerInfo.user.name);
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
    } else if (paymentMethod === "midtrans") {
      setIsProcessingPayment(true);
      try {
        // Create a unique order ID
        const orderId = `FIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Create subscription record first (with pending status)
        const subscription = await createSubscriptionMutation.mutateAsync({
          memberId: memberID,
          packageId: selectedPackage,
          trainerId:
            subscriptionType === "trainer" ? selectedTrainer : undefined,
          startDate: startDate,
          // endDate is removed as it is not part of the expected type
          subsType: subscriptionType,
          duration:
            subscriptionType === "gym"
              ? (selectedPackageDetails.day ?? 0)
              : (selectedPackageDetails.sessions ?? 0),
          paymentMethod: "midtrans", // Indicate online payment
          totalPayment: calculateTotal(),
          status: "PENDING", // Start as pending until payment is confirmed
          orderReference: orderId,
        });

        // Format item details
        const itemDetails = [
          {
            id: selectedPackage,
            name: selectedPackageDetails.name,
            price: calculateTotal(),
            quantity: 1,
          },
        ];

        // Create the transaction with Midtrans
        const transactionResponse = await createPaymentMutation.mutateAsync({
          orderId,
          amount: calculateTotal(),
          customerName: Member?.user?.name || "Member",
          customerEmail: Member?.user?.email || undefined,
          itemDetails,
          callbackUrl: `${window.location.origin}/checkout/confirmation/${memberID}?subscriptionId=${subscription.id}`,
        });

        // Open Midtrans Snap payment page
        if (transactionResponse.token) {
          // Load Snap.js when needed
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
                  // Update the payment status to SUCCESS
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
                  // Still redirect to subscription page, as payment was successful
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
          toast.error("Failed to initialize payment");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Payment process failed",
        );
      } finally {
        setIsProcessingPayment(false);
      }
    } else {
      const promise = async () => {
        await createSubscriptionMutation.mutateAsync({
          memberId: memberID,
          packageId: selectedPackage,
          trainerId:
            subscriptionType === "trainer" ? selectedTrainer : undefined,
          startDate: startDate,
          // endDate: endDate,
          subsType: subscriptionType,
          duration:
            subscriptionType === "gym"
              ? (selectedPackageDetails.day ?? 0)
              : (selectedPackageDetails.sessions ?? 0),
          paymentMethod,
          totalPayment: calculateTotal(),
        });

        await utils.subs.getByIdMember.invalidate({ memberId: memberID });
        router.push(`/management/subscription/${memberID}`);
      };

      toast.promise(promise, {
        loading: "Processing subscription...",
        success: "Subscription has been created successfully!",
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
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
                    // Only allow switching to trainer if member has active gym membership
                    if (value === "trainer" && !hasActiveGymMembership) {
                      return;
                    }
                    setSubscriptionType(value as "gym" | "trainer");
                    setSelectedPackage("");
                    setSelectedTrainer("");
                  }}
                >
                  <TabsList className={`grid w-full ${hasActiveGymMembership ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <TabsTrigger value="gym">Gym Membership</TabsTrigger>
                    {hasActiveGymMembership && (
                      <TabsTrigger value="trainer">Personal Trainer</TabsTrigger>
                    )}
                  </TabsList>
                  
                  {!hasActiveGymMembership && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Personal Trainer sessions require an active gym membership.
                        Please purchase a gym membership first to access personal training services.
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
                                  className="flex flex-1 justify-between"
                                >
                                  <span>
                                    {pkg.name} ({pkg.day} Days)
                                  </span>
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
                                    className="flex flex-1 justify-between"
                                  >
                                    <span>
                                      {pkg.name} ({pkg.sessions} sessions)
                                    </span>
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
                </Tabs>
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
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="midtrans" id="midtrans" />
                      <Label
                        htmlFor="midtrans"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Online (Card/QRIS/E-Wallet)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="qris" id="qris" />
                      <Label htmlFor="qris" className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Manual Bukti Bayar
                      </Label>
                    </div>
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
                  <h3 className="mb-3 text-lg font-medium">Order Summary</h3>
                  <div className="space-y-2">
                    {selectedPackageDetails ? (
                      <>
                        <div className="flex justify-between">
                          <span>Subscription:</span>
                          <span>
                            {subscriptionType === "gym"
                              ? "Gym Membership"
                              : "Personal Training"}
                          </span>
                        </div>

                        {subscriptionType === "trainer" && selectedTrainer && (
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
                          <span>{selectedPackageDetails.name}</span>
                        </div>

                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>
                            Rp{" "}
                            {selectedPackageDetails.price.toLocaleString(
                              "id-ID",
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
                    (subscriptionType === "trainer" && !selectedTrainer) ||
                    isProcessingPayment
                  }
                  onClick={handleSubmit}
                >
                  {isProcessingPayment
                    ? "Processing..."
                    : paymentMethod === "qris"
                      ? "Proceed to Upload Bukti Bayar"
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
