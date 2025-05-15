"use client";

import { useState, use, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ArrowLeft, UploadCloud } from "lucide-react";
import Link from "next/link";

function CheckoutValidateContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = api.useUtils();

    const memberID = params.memberID as string;

    // Extract details from query parameters
    const packageId = searchParams.get("packageId") || "";
    const packageName = searchParams.get("packageName") || "N/A";
    const packagePrice = searchParams.get("packagePrice") || "0";
    const packageType = searchParams.get("packageType") || "N/A";
    const duration = searchParams.get("duration") || "0";
    const totalPayment = searchParams.get("totalPayment") || "0";
    const paymentMethod = searchParams.get("paymentMethod") || "N/A";
    const trainerId = searchParams.get("trainerId");
    const trainerName = searchParams.get("trainerName");
    const voucherId = searchParams.get("voucherId");
    const voucherName = searchParams.get("voucherName");
    const voucherAmount = searchParams.get("voucherAmount");
    const voucherDiscountType = searchParams.get("voucherDiscountType");

    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const uploadFileMutation = api.paymentValidation.uploadFile.useMutation();
    const createPaymentValidation = api.paymentValidation.create.useMutation();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setPaymentProofFile(event.target.files[0]);
        }
    };

    const handleSubmitProof = async () => {
        if (!paymentProofFile) {
            toast.error("Please upload your proof of payment.");
            return;
        }
        if (!memberID || !packageId) {
            toast.error("Missing necessary information to proceed.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Convert file to base64
            const fileToBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
            };

            // Step 1: Upload the file using tRPC
            console.log('Starting file upload...');
            const base64Data = await fileToBase64(paymentProofFile);
            
            const uploadResult = await uploadFileMutation.mutateAsync({
                fileData: base64Data,
                fileName: paymentProofFile.name,
                fileType: paymentProofFile.type,
                memberId: memberID,
            });

            console.log('File uploaded successfully:', uploadResult);

            if (!uploadResult.success || !uploadResult.filePath) {
                throw new Error("File upload failed");
            }

            // Step 2: Create PaymentValidation entry
            await createPaymentValidation.mutateAsync({
                memberId: memberID,
                packageId: packageId,
                trainerId: trainerId || undefined,
                subsType: packageType,
                duration: parseInt(duration, 10),
                totalPayment: parseFloat(totalPayment),
                paymentMethod: paymentMethod,
                filePath: uploadResult.filePath,
            });

            toast.success("Proof of payment submitted successfully! Please wait for admin approval.");
            router.push(`/management/subscription/${memberID}`);
            await utils.paymentValidation.listWaiting.invalidate();

        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
            toast.error(`Submission failed: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: string | number) => {
        return `Rp ${Number(amount).toLocaleString('id-ID')}`;
    };

    return (
        <div className="container mx-auto p-5 max-w-2xl">
            <Button variant="outline" onClick={() => router.back()} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Checkout
            </Button>
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle>Complete Your Payment</CardTitle>
                    <CardDescription>
                        Please upload the proof of your payment for the subscription.
                        Your subscription will be activated after admin approval.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-3">Order Summary</h3>
                        <div className="space-y-2 p-4 border rounded-md bg-background">
                            <div className="flex justify-between">
                                <span>Member ID:</span>
                                <span>{memberID}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Package:</span>
                                <span>{packageName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Type:</span>
                                <span>{packageType === "gym" ? "Gym Membership" : "Personal Training"}</span>
                            </div>
                            {packageType === "trainer" && trainerName && (
                                <div className="flex justify-between">
                                    <span>Trainer:</span>
                                    <span>{trainerName}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>Duration:</span>
                                <span>{duration} {packageType === "gym" ? "Days" : "Sessions"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Price:</span>
                                <span>{formatCurrency(packagePrice)}</span>
                            </div>
                            {voucherName && (
                                <div className="flex justify-between text-green-600">
                                    <span>Voucher: {voucherName}</span>
                                    <span>
                                        {voucherDiscountType === "PERCENT" 
                                            ? `-${voucherAmount}%` 
                                            : `- ${formatCurrency(voucherAmount || "0")}`}
                                    </span>
                                </div>
                            )}
                            <hr className="my-2"/>
                            <div className="flex justify-between font-bold">
                                <span>Total Payment:</span>
                                <span>{formatCurrency(totalPayment)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Payment Method:</span>
                                <span>{paymentMethod === "qris" ? "Pembayaran Langsung (QRIS)" : paymentMethod}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="payment-proof" className="text-lg font-medium mb-3 block">Upload Proof of Payment</Label>
                        <div className="flex items-center justify-center w-full">
                            <label
                                htmlFor="payment-proof-input"
                                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted/80"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-muted-foreground">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, JPEG, PDF (MAX. 5MB)</p>
                                </div>
                                <Input 
                                    id="payment-proof-input" 
                                    type="file" 
                                    className="hidden" 
                                    onChange={handleFileChange}
                                    accept="image/png, image/jpeg, image/jpg, application/pdf" 
                                />
                            </label>
                        </div>
                        {paymentProofFile && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Selected file: {paymentProofFile.name}
                            </p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-infinity"
                        onClick={handleSubmitProof}
                        disabled={!paymentProofFile || isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : "Submit Proof"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


export default function CheckoutValidatePage() {
    return (
        <Suspense fallback={<div>Loading payment details...</div>}>
            <CheckoutValidateContent />
        </Suspense>
    );
} 