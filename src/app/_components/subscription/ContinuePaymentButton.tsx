
"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface ContinuePaymentButtonProps {
  orderReference: string;
  paymentInfo: {
    totalPayment: number;
    subscriptionId: string;
  };
  customerName?: string;
  customerEmail?: string;
  packageInfo: {
    id: string;
    name: string;
  };
  onSuccess?: () => void;
  buttonText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}

export function ContinuePaymentButton({
  orderReference,
  paymentInfo,
  customerName = "Member",
  customerEmail,
  packageInfo,
  onSuccess,
  buttonText = "Continue Payment",
  variant = "default",
  className = "",
}: ContinuePaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createPaymentMutation = api.payment.createTransaction.useMutation();
  const updatePaymentStatusMutation = api.subs.updatePaymentStatus.useMutation();
  
  const handleContinuePayment = async () => {
    setIsProcessing(true);
    try {
      // Format item details
      const itemDetails = [{
        id: packageInfo.id,
        name: packageInfo.name,
        price: paymentInfo.totalPayment,
        quantity: 1
      }];

      // Create a transaction with Midtrans
      const transactionResponse = await createPaymentMutation.mutateAsync({
        orderId: orderReference,
        amount: paymentInfo.totalPayment,
        customerName,
        customerEmail,
        itemDetails,
        callbackUrl: `${window.location.origin}/checkout/confirmation/${orderReference}?subscriptionId=${paymentInfo.subscriptionId}`,
      });

      if (transactionResponse.token) {
        // Clean up any existing snap instances
        if (window.snap) {
          delete window.snap;
        }

        // Remove any existing scripts to prevent conflicts
        const existingScripts = document.querySelectorAll('script[src*="midtrans"]');
        existingScripts.forEach(script => script.remove());

        // Load Snap.js properly with the correct configuration
        const snapScript = document.createElement('script');
        snapScript.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        snapScript.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
        document.body.appendChild(snapScript);

        snapScript.onload = () => {
          // @ts-ignore - window.snap is from the loaded script
          window.snap.pay(transactionResponse.token, {
            skipOrderSummary: true,
            showOrderId: false,
            theme: "#4169E1",
            
            onSuccess: async function(result: any) {
              try {
                await updatePaymentStatusMutation.mutateAsync({
                  orderReference,
                  status: "SUCCESS",
                  gatewayResponse: result
                });
                
                toast.success('Payment successful!');
                if (onSuccess) onSuccess();
                else window.location.reload();
              } catch (error) {
                console.error('Error updating payment status:', error);
                toast.error('Payment was successful but there was an error updating your subscription');
                window.location.reload();
              }
            },
            onPending: function(result: any) {
              toast.info('Payment pending, waiting for confirmation');
              window.location.reload();
            },
            onError: function(result: any) {
              toast.error('Payment failed');
              console.error(result);
            },
            onClose: function() {
              toast.info('Payment window closed, transaction may still be processing');
              setIsProcessing(false);
            }
          });
        };
      } else {
        toast.error('Failed to initialize payment');
        setIsProcessing(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment process failed');
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleContinuePayment} 
      disabled={isProcessing}
      variant={variant}
      className={className}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : buttonText}
    </Button>
  );
}