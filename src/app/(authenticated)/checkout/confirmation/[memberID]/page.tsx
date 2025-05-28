"use client"

// Extend the Window interface to include the 'snap' property
declare global {
  interface Window {
    snap?: any;
  }
}

import { useState, useEffect, use } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { api } from "@/trpc/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ConfirmationPage({ params }: { params: Promise<{ memberID: string }> }) {
  const { memberID } = use(params)
  const searchParams = useSearchParams()
  const subscriptionId = searchParams.get("subscriptionId")
  const orderReference = searchParams.get("orderRef")
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [isContinuingPayment, setIsContinuingPayment] = useState(false);
  

  // Payment status check mutation
  const checkPaymentStatusMutation = api.payment.checkStatus.useQuery(
    { orderId: orderReference! }, 
    { enabled: false }
  )
  
  // Update payment status mutation
  const updatePaymentStatusMutation = api.subs.updatePaymentStatus.useMutation()

  // Extract payment and subscription from data response
  const { data: subscriptionData, isLoading: isLoadingSubscription, refetch: refetchSubscription  } =
  orderReference
    ? api.subs.getByOrderReference.useQuery({ orderReference }, { enabled: !!orderReference })
    : api.subs.getById.useQuery({ id: subscriptionId! }, { enabled: !!subscriptionId });

const subscription = subscriptionData?.subscription;
const payment = subscriptionData?.payment;


  const checkPaymentStatus = async () => {
    if (!orderReference || !payment) {
      toast.error("Cannot check status: Missing payment information");
      return;
    }
    
    // Don't check if we don't have a token
    if (!payment.token) {
      toast.error("Cannot check status: No payment token available");
      return;
    }
    
    setIsCheckingStatus(true)
    try {
        console.log(`Checking payment status for order: ${orderReference}`);
        const result = await checkPaymentStatusMutation.refetch()
        
        if (result.data) {
            console.log(`Received payment status:`, result.data);
            
            // Map Midtrans status to our payment status - be very explicit
            let status: "SUCCESS" | "PENDING" | "FAILED";
            
            switch(result.data.transaction_status) {
                case "capture":
                case "settlement":
                    status = result.data.fraud_status === "challenge" ? "PENDING" : "SUCCESS";
                    break;
                case "deny":
                case "cancel":
                case "expire":
                    status = "FAILED";
                    break;
                default:
                    status = "PENDING";
            }
            
            console.log(`Mapped status to: ${status}, current payment status: ${payment?.status}`);
            
            // Update our payment status if it has changed
            if (payment?.status !== status) {
                console.log(`Updating payment status to: ${status}`);
                await updatePaymentStatusMutation.mutateAsync({
                    orderReference,
                    status,
                    gatewayResponse: result.data
                })
                
                await refetchSubscription()
                
                // Show appropriate toast
                if (status === "SUCCESS") {
                    toast.success("Payment has been confirmed!")
                    
                    // Clear polling interval if payment is finalized
                    if (pollingInterval) {
                        clearInterval(pollingInterval)
                        setPollingInterval(null)
                    }
                } else if (status === "FAILED") {
                    toast.error("Payment has failed or been cancelled")
                    
                    // Clear polling interval if payment is finalized
                    if (pollingInterval) {
                        clearInterval(pollingInterval)
                        setPollingInterval(null)
                    }
                }
            } else {
                console.log(`No status change needed, still: ${payment?.status}`);
            }
        }
    } catch (error) {
        console.error("Error checking payment status:", error)
        toast.error("Failed to check payment status")
    } finally {
        setIsCheckingStatus(false)
    }
  }
  
  const continuePayment = async () => {
    if (!payment?.orderReference || !subscription) {
      toast.error("Cannot continue payment: missing payment information");
      return;
    }
    
    setIsContinuingPayment(true);
    try {
      // Get the original order reference
      const orderId = payment.orderReference;
      const token = payment.token;
      

      if (token) {
        // Clean up any existing snap instances
        if (window.snap) {
          delete window.snap;
        }

        // Load Snap.js properly with the correct configuration
        const snapScript = document.createElement('script');
        snapScript.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        snapScript.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
        document.body.appendChild(snapScript);

        snapScript.onload = () => {
          // @ts-ignore - window.snap is from the loaded script
          window.snap.pay(token, {
          
            onSuccess: async function(result: any) {
              try {
                console.log("Continue payment success, updating status", result);
                
                await updatePaymentStatusMutation.mutateAsync({
                  orderReference: orderId,
                  status: "SUCCESS",
                  gatewayResponse: result
                });
                
                toast.success('Payment successful!');
                await refetchSubscription();
              } catch (error) {
                console.error('Error updating payment status:', error);
                toast.error('Payment successful but error updating status');
                // Refresh the page to show latest status
                window.location.reload();
              }
            },
            onPending: function(result: any) {
              toast.info('Payment pending, waiting for confirmation');
              refetchSubscription();
            },
            onError: function(result: any) {
              toast.error('Payment failed');
              console.error(result);
            },
            onClose: function() {
              // Just refresh the data when closed
              refetchSubscription();
            }
          });
        };
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error continuing payment');
    } finally {
      setIsContinuingPayment(false);
    }
  };
  
  // Remove automatic polling and only check status manually
  useEffect(() => {
    // Clean up any intervals that might be running
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [])
  
  if (isLoadingSubscription) {
    return (
      <div className="container mx-auto p-5 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium">Loading payment information...</h2>
        </div>
      </div>
    )
  }
  
  if (!subscriptionData) {
    return (
      <div className="container mx-auto p-5">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            We couldn't find the subscription information. Please contact support.
          </AlertDescription>
        </Alert>
        
        <Button asChild>
          <Link href={`/management/subscription/${memberID}`}>Return to Subscriptions</Link>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold mb-2">Payment Confirmation</h1>
      <p className="mb-6 text-muted-foreground">
        Subscription ID: {subscription?.id}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {payment?.status === "SUCCESS" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Payment Successful
                  </>
                ) : payment?.status === "PENDING" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                    Payment Pending
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    Payment Failed
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {payment?.status === "SUCCESS" 
                  ? "Your payment has been successfully processed and your subscription is now active."
                  : payment?.status === "PENDING"
                  ? "We're waiting for confirmation of your payment. This page will update automatically."
                  : "There was an issue with your payment. Please try again or contact support."}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Subscription Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Package:</div>
                  <div>{subscription?.package?.name}</div>
                  
                  <div className="text-muted-foreground">Type:</div>
                  <div>{subscription?.package?.type === "GYM_MEMBERSHIP" ? "Gym Membership" : "Personal Training"}</div>
                  
                  {subscription?.trainerId && (
                    <>
                      <div className="text-muted-foreground">Trainer:</div>
                      <div>{subscription?.trainer?.user?.name || "N/A"}</div>
                    </>
                  )}
                  
                  <div className="text-muted-foreground">Start Date:</div>
                  <div>{new Date(subscription?.startDate ?? "").toLocaleDateString()}</div>
                  
                  {subscription?.endDate && (
                    <>
                      <div className="text-muted-foreground">End Date:</div>
                      <div>{new Date(subscription?.endDate).toLocaleDateString()}</div>
                    </>
                  )}
                  
                  {subscription?.remainingSessions !== null && subscription?.remainingSessions !== undefined && (
                    <>
                      <div className="text-muted-foreground">Sessions:</div>
                      <div>{subscription.remainingSessions}</div>
                    </>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Payment Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Payment Method:</div>
                  <div className="capitalize">{payment?.method}</div>
                  
                  <div className="text-muted-foreground">Amount:</div>
                  <div>Rp {payment?.totalPayment.toLocaleString('id-ID')}</div>
                  
                  <div className="text-muted-foreground">Payment Status:</div>
                  <div className="capitalize">{payment?.status.toLowerCase()}</div>
                  
                  <div className="text-muted-foreground">Order Reference:</div>
                  <div className="font-mono text-xs">{payment?.orderReference || "N/A"}</div>
                  
                  <div className="text-muted-foreground">Date:</div>
                  <div>{new Date(payment?.createdAt || Date.now()).toLocaleString()}</div>
                </div>
              </div>
              
              {payment?.status === "PENDING" && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTitle className="text-yellow-800">Waiting for Payment</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    Your subscription will be activated as soon as we receive confirmation of your payment.
                    This page will update automatically when the payment is confirmed.
                  </AlertDescription>
                </Alert>
              )}
              
              {payment?.status === "FAILED" && (
                <Alert variant="destructive">
                  <AlertTitle>Payment Failed</AlertTitle>
                  <AlertDescription>
                    We couldn't process your payment. You can try again or choose a different payment method.
                  </AlertDescription>
                </Alert>
              )}
              
              {payment?.status === "SUCCESS" && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertTitle className="text-green-800">Thank you for your payment!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your subscription is now active. You can now enjoy all the benefits of your membership.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              {payment?.status === "PENDING" ? (
                <>
                  <Button
                    onClick={() => checkPaymentStatus()}
                    disabled={isCheckingStatus || !payment?.token}
                    variant="outline"
                  >
                    {isCheckingStatus ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Payment Status"
                    )}
                  </Button>
                  
                  <Button
                    onClick={continuePayment}
                    disabled={isContinuingPayment || !payment?.token}
                    className="bg-infinity"
                  >
                    {isContinuingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue Payment"
                    )}
                  </Button>
                </>
              ) : (
                <></>
                // <Button
                //   className="w-full sm:w-auto"
                //   asChild
                // >
                //   <Link href={`/management/subscription/${memberID}`}>
                //     View My Subscriptions <ArrowRight className="ml-2 h-4 w-4" />
                //   </Link>
                // </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Having trouble with your payment or subscription?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Contact Support</h3>
                <p className="text-sm text-muted-foreground">
                  Our team is available to help you with any questions or issues you may have.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Try Another Payment Method</h3>
                <p className="text-sm text-muted-foreground">
                  If you're experiencing issues with your current payment method, you can try a different one.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/contact">Contact Support</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}