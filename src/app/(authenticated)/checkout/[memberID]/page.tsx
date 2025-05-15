"use client"

import { useState, use, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, CreditCard, QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/trpc/react"
import { useRouter } from "next/navigation";
import { toast } from "sonner"
import { VoucherModal } from "@/app/(authenticated)/management/subscription/voucherModal";

export default function SubscriptionPage({ params }: { params: Promise<{ memberID: string }> }) {
    const { memberID } = use(params)
    const router = useRouter();
    const utils = api.useUtils();
    const { data: Member } = api.member.getById.useQuery({ id: memberID });
    const { data: gymPackages } = api.package.listByType.useQuery({ type: "GYM_MEMBERSHIP" });
    const { data: trainerPackages } = api.package.listByType.useQuery({ type: "PERSONAL_TRAINER" });
    const { data: trainers } = api.personalTrainer.listAll.useQuery();

    const createSubscriptionMutation = api.subs.create.useMutation();

    const [subscriptionType, setSubscriptionType] = useState<"gym" | "trainer">("gym")
    const [selectedPackage, setSelectedPackage] = useState("")
    const [selectedTrainer, setSelectedTrainer] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("qris")
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<{ id: string; name: string; amount: number; discountType: "PERCENT" | "CASH" } | null>(null);

    const selectedPackageDetails = subscriptionType === "gym" ? gymPackages?.find((p) => p.id === selectedPackage) : trainerPackages?.find((p) => p.id === selectedPackage);

    const calculateTotal = () => {
        if (!selectedPackageDetails) return 0

        let total = selectedPackageDetails.price
        if (selectedVoucher) {
            if (selectedVoucher.discountType === "PERCENT") {
                total = total - (total * selectedVoucher.amount) / 100
            } else {
                total = total - selectedVoucher.amount
            }
        }
        // Ensure total is not negative
        return Math.max(0, total);
    }

    const handleSubmit = async () => {
        if (!selectedPackageDetails) {
            toast.error("Please select a package.");
            return;
        }
        if (subscriptionType === "trainer" && !selectedTrainer) {
            toast.error("Please select a personal trainer.");
            return;
        }

        if (paymentMethod === "qris") {
            const queryParams = new URLSearchParams({
                memberId: memberID,
                packageId: selectedPackage,
                packageName: selectedPackageDetails.name,
                packagePrice: selectedPackageDetails.price.toString(),
                packageType: subscriptionType,
                duration: (subscriptionType === "gym" ? selectedPackageDetails.day ?? 0 : selectedPackageDetails.sessions ?? 0).toString(),
                totalPayment: calculateTotal().toString(),
                paymentMethod: paymentMethod,
            });

            if (subscriptionType === "trainer" && selectedTrainer) {
                queryParams.set("trainerId", selectedTrainer);
                const trainerInfo = trainers?.find(t => t.id === selectedTrainer);
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

        } else {
            // This block handles other payment methods, if any are added in the future,
            // or if the current "qris"-only setup is temporary.
            // For now, it would effectively be the old direct subscription creation logic.
            // If "qris" is the *only* method that will ever exist, this else might be redundant
            // or adapted to show an error if an unknown payment method is somehow selected.

            const promise = async () => {
                await createSubscriptionMutation.mutateAsync({
                    memberId: memberID,
                    packageId: selectedPackage,
                    trainerId: subscriptionType === "trainer" ? selectedTrainer : undefined,
                    startDate: new Date(),
                    subsType: subscriptionType,
                    duration: subscriptionType === "gym" ? selectedPackageDetails.day ?? 0 : selectedPackageDetails.sessions ?? 0,
                    paymentMethod,
                    totalPayment: calculateTotal(),
                    // Consider adding voucher details if createSubscriptionMutation supports it
                });

                await utils.subs.getByIdMember.invalidate({ memberId: memberID });
                router.push(`/management/subscription/${memberID}`);
            };

            toast.promise(promise, {
                loading: 'Processing subscription...',
                success: 'Subscription has been created successfully!',
                error: (error) => error instanceof Error ? error.message : String(error),
            });
        }
    }

    return (
        <div className="container mx-auto p-5">
            <h1 className="text-3xl font-bold">Subscription Checkout</h1>
            <p className="mb-6 text-muted-foreground mt-1">Member: {Member?.user?.name}</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle>Choose Subscription Type</CardTitle>
                            <CardDescription>Select the type of subscription you want</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs
                                defaultValue="gym"
                                onValueChange={(value) => {
                                    setSubscriptionType(value as "gym" | "trainer")
                                    setSelectedPackage("")
                                    setSelectedTrainer("")
                                }}
                            >
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="gym">Gym Membership</TabsTrigger>
                                    <TabsTrigger value="trainer">Personal Trainer</TabsTrigger>
                                </TabsList>
                                <TabsContent value="gym" className="pt-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-medium mb-3">Select Gym Package</h3>
                                            <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {gymPackages?.map((pkg) => (
                                                        <div key={pkg.id} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={pkg.id} id={pkg.id} />
                                                            <Label htmlFor={pkg.id} className="flex flex-1 justify-between">
                                                                <span>
                                                                    {pkg.name} ({pkg.day} Days)
                                                                </span>
                                                                <span className="font-semibold">Rp {pkg.price.toLocaleString('id-ID')}</span>
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
                                            <h3 className="text-lg font-medium mb-3">Select Personal Trainer</h3>
                                            <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
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
                                                        <SelectItem disabled value="no data">No data</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {selectedTrainer && (
                                            <div>
                                                <h3 className="text-lg font-medium mb-3">Select Training Package</h3>
                                                <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {trainerPackages?.map((pkg) => (
                                                            <div key={pkg.id} className="flex items-center space-x-2">
                                                                <RadioGroupItem value={pkg.id} id={pkg.id} />
                                                                <Label htmlFor={pkg.id} className="flex flex-1 justify-between">
                                                                    <span>
                                                                        {pkg.name} ({pkg.sessions} sessions)
                                                                    </span>
                                                                    <span className="font-semibold">Rp {pkg.price.toLocaleString('id-ID')}</span>
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
                                <h3 className="text-lg font-medium mb-3">Payment Method</h3>
                                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center space-x-2 rounded-md border p-3">
                                        <RadioGroupItem value="qris" id="qris" />
                                        <Label htmlFor="qris" className="flex items-center gap-2">
                                            <QrCode className="h-4 w-4" />
                                            Pembayaran Langsung
                                        </Label>
                                    </div>
                                    {/* <div className="flex items-center space-x-2 rounded-md border p-3">
                                        <RadioGroupItem value="bankA" id="bankA" />
                                        <Label htmlFor="bankA" className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            Bank A
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 rounded-md border p-3">
                                        <RadioGroupItem value="bankB" id="bankB" />
                                        <Label htmlFor="bankB" className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            Bank B
                                        </Label>
                                    </div> */}
                                </RadioGroup>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-3">Voucher</h3>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setIsVoucherModalOpen(true)}
                                >
                                    {selectedVoucher ? (
                                        <div className="flex items-center justify-between w-full">
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
                                <h3 className="text-lg font-medium mb-3">Order Summary</h3>
                                <div className="space-y-2">
                                    {selectedPackageDetails ? (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Subscription:</span>
                                                <span>{subscriptionType === "gym" ? "Gym Membership" : "Personal Training"}</span>
                                            </div>

                                            {subscriptionType === "trainer" && selectedTrainer && (
                                                <div className="flex justify-between">
                                                    <span>Trainer:</span>
                                                    <span>{trainers?.find((t) => t.id === selectedTrainer)?.user?.name}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between">
                                                <span>Package:</span>
                                                <span>{selectedPackageDetails.name}</span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span>Price:</span>
                                                <span>Rp {selectedPackageDetails.price.toLocaleString('id-ID')}</span>
                                            </div>

                                            {selectedVoucher && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Discount:</span>
                                                    <span>
                                                        {selectedVoucher.discountType === "PERCENT" 
                                                            ? `${selectedVoucher.amount}%` 
                                                            : `Rp ${selectedVoucher.amount.toLocaleString()}`}
                                                    </span>
                                                </div>
                                            )}

                                            <Separator className="my-2" />

                                            <div className="flex justify-between font-bold">
                                                <span>Total:</span>
                                                <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground">Select a package to see the summary</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-infinity"
                                disabled={!selectedPackageDetails || (subscriptionType === "trainer" && !selectedTrainer)}
                                onClick={handleSubmit}
                            >
                                {paymentMethod === "qris" ? "Proceed to Upload Bukti Bayar" : "Complete Checkout"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <VoucherModal
                isOpen={isVoucherModalOpen}
                onClose={() => setIsVoucherModalOpen(false)}
                onVoucherApplied={(voucher) => setSelectedVoucher(voucher.id ? voucher : null)}
                currentVoucher={selectedVoucher || undefined}
            />
        </div>
    )
}