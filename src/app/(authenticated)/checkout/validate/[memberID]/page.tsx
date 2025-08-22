"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
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
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ArrowLeft, UploadCloud } from "lucide-react";
import Link from "next/link";

function CheckoutValidateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();

  const memberID = params?.memberID as string;

  // Early return if memberID is not available
  if (!memberID) {
    return (
      <div className="container mx-auto max-w-2xl p-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p>Member ID is required to proceed with payment validation.</p>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/member')}
            className="mt-4"
          >
            Go to Members
          </Button>
        </div>
      </div>
    );
  }

  // Extract details from query parameters with null checks
  const cartParam = searchParams?.get("cart");
  const totalPayment = searchParams?.get("totalPayment") || "0";
  const paymentMethod = searchParams?.get("paymentMethod") || "N/A";
  const voucherId = searchParams?.get("voucherId");
  const voucherName = searchParams?.get("voucherName");
  const voucherAmount = searchParams?.get("voucherAmount");
  const voucherDiscountType = searchParams?.get("voucherDiscountType");
  const salesId = searchParams?.get("salesId");
  const salesType = searchParams?.get("salesType");
  const salesName = searchParams?.get("salesName");

  // Parse cart data for multi-item or fallback to single-item for backward compatibility
  let cartItems: Array<{
    type: string;
    packageId: string;
    name: string;
    price: number;
    trainerId?: string;
    sessions?: number;
    day?: number;
  }> = [];

  if (cartParam) {
    try {
      cartItems = JSON.parse(decodeURIComponent(cartParam));
    } catch (error) {
      console.error("Failed to parse cart data:", error);
    }
  }

  // Fallback to single-item mode for backward compatibility
  if (cartItems.length === 0) {
    const packageId = searchParams?.get("packageId") || "";
    const packageName = searchParams?.get("packageName") || "N/A";
    const packagePrice = searchParams?.get("packagePrice") || "0";
    const packageType = searchParams?.get("packageType") || "N/A";
    const duration = searchParams?.get("duration") || "0";
    const sessions = searchParams?.get("sessions") || "0";
    const trainerId = searchParams?.get("trainerId");

    if (packageId) {
      cartItems = [{
        type: packageType,
        packageId: packageId,
        name: packageName,
        price: parseFloat(packagePrice),
        trainerId: trainerId || undefined,
        sessions: packageType === "trainer" || packageType === "group" ? parseInt(sessions) : undefined,
        day: packageType === "gym" ? parseInt(duration) : undefined,
      }];
    }
  }

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadFileMutation = api.paymentValidation.uploadFile.useMutation();
  const createPaymentValidation = api.paymentValidation.create.useMutation();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setPaymentProofFile(event.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
    if (!paymentProofFile) {
      toast.error("Please upload your proof of payment.");
      return;
    }
    if (!memberID || cartItems.length === 0) {
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
          reader.onerror = (error) => reject(error);
        });
      };

      // Step 1: Upload the file using tRPC
      console.log("Starting file upload...");
      const base64Data = await fileToBase64(paymentProofFile);

      const uploadResult = await uploadFileMutation.mutateAsync({
        fileData: base64Data,
        fileName: paymentProofFile.name,
        fileType: paymentProofFile.type,
        userId: memberID,
      });

      console.log("File uploaded successfully:", uploadResult);

      if (!uploadResult.success || !uploadResult.filePath) {
        throw new Error("File upload failed");
      }

      // Step 2: Create PaymentValidation entries for each cart item
      for (const item of cartItems) {
        await createPaymentValidation.mutateAsync({
          userId: memberID,
          packageId: item.packageId,
          trainerId: item.trainerId || undefined,
          subsType: item.type,
          duration: item.day || 0,
          sessions: item.sessions || undefined,
          totalPayment: item.price,
          paymentMethod: paymentMethod,
          filePath: uploadResult.filePath,
          voucherId: voucherId || undefined,
          salesId: salesId || undefined,
          salesType: salesType || undefined,
        });
      }

      toast.success(
        "Proof of payment submitted successfully! Please wait for admin approval.",
      );
      router.push(`/member/payment-history`);
      await utils.paymentValidation.listWaiting.invalidate();
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error(`Submission failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return `Rp ${Number(amount).toLocaleString("id-ID")}`;
  };

  return (
    <div className="container mx-auto max-w-2xl p-5">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Checkout
      </Button>
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Please upload the proof of your payment for the subscription. Your
            subscription will be activated after admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-3 text-lg font-medium">Order Summary</h3>
            <div className="space-y-2 rounded-md border bg-background p-4">
              <div className="flex justify-between">
                <span>Member ID:</span>
                <span>{memberID}</span>
              </div>
              
              {/* Cart Items */}
              {cartItems.map((item, index) => (
                <div key={index} className="border-b pb-2 mb-2 last:border-b-0">
                  <div className="flex justify-between">
                    <span>Package:</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>
                      {item.type === "gym"
                        ? "Gym Membership"
                        : item.type === "trainer"
                        ? "Personal Training"
                        : "Group Training"}
                    </span>
                  </div>
                  {item.trainerId && (
                    <div className="flex justify-between">
                      <span>Trainer ID:</span>
                      <span>{item.trainerId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>
                      {item.type === "gym" ? item.day : item.sessions} {item.type === "gym" ? "Days" : "Sessions"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
              
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
              {salesName && (
                <div className="flex justify-between text-blue-600">
                  <span>Sales: {salesName}</span>
                  <span>{salesType === "PersonalTrainer" ? "PT" : "FC"}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total Payment:</span>
                <span>{formatCurrency(totalPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span>
                  {paymentMethod === "qris"
                    ? "Pembayaran Langsung (QRIS)"
                    : paymentMethod}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label
              htmlFor="payment-proof"
              className="mb-3 block text-lg font-medium"
            >
              Upload Proof of Payment
            </Label>
            <div className="flex w-full items-center justify-center">
              <label
                htmlFor="payment-proof-input"
                className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background hover:bg-muted/80"
              >
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  <UploadCloud className="mb-3 h-10 w-10 text-gray-400" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG, PDF (MAX. 5MB)
                  </p>
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
    <Suspense fallback={
      <div className="container mx-auto max-w-2xl p-5">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading payment details...</p>
          </div>
        </div>
      </div>
    }>
      <CheckoutValidateContent />
    </Suspense>
  );
}
