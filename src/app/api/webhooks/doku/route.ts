// src/app/api/webhooks/doku/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";
import { dokuPaymentService } from "@/lib/payment/doku";
import { mapDokuStatus } from "@/types/doku";
import { PaymentStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');
    const timestamp = request.headers.get('x-timestamp');
    const url = request.url;

    // Verify webhook signature
    if (!signature || !timestamp) {
      console.error('Missing signature or timestamp in webhook');
      return NextResponse.json({ error: 'Missing signature or timestamp' }, { status: 400 });
    }

    // Verify the webhook signature
    const isValid = dokuPaymentService.verifyWebhookSignature(
      body,
      signature,
      timestamp,
      url
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    console.log('DOKU Webhook received:', webhookData);

    // Extract order information
    const orderId = webhookData.order?.invoice_number || webhookData.partnerReferenceNo;
    const dokuStatus = webhookData.order?.status || webhookData.transaction?.status;

    if (!orderId || !dokuStatus) {
      console.error('Missing order ID or status in webhook data');
      return NextResponse.json({ error: 'Missing order ID or status' }, { status: 400 });
    }

    // Find the payment record
    const payment = await db.payment.findFirst({
      where: { orderReference: orderId },
      include: { subscription: true },
    });

    if (!payment) {
      console.error(`Payment not found for order ID: ${orderId}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Map DOKU status to our system status
    const newStatus = mapDokuStatus(dokuStatus);
    
    // Update payment status
    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt: newStatus === "SUCCESS" ? new Date() : payment.paidAt,
        gatewayResponse: webhookData,
        updatedAt: new Date(),
      },
      include: {
        subscription: {
          include: {
            member: {
              include: { user: true },
            },
            package: true,
          },
        },
      },
    });

    // If payment is successful, activate the membership
    if (newStatus === "SUCCESS" && payment.subscription) {
      // Update membership to active
      await db.membership.update({
        where: { id: payment.subscription.memberId },
        data: { isActive: true },
      });

      // Award points if applicable
      if (updatedPayment.subscription?.package?.point && updatedPayment.subscription.package.point > 0) {
        await db.user.update({
          where: { id: updatedPayment.subscription.member.userId },
          data: {
            point: { increment: updatedPayment.subscription.package.point },
          },
        });
      }

      console.log(`Payment ${orderId} marked as successful, membership activated`);
    }

    return NextResponse.json({ 
      status: 'success',
      message: 'Webhook processed successfully',
      orderId,
      newStatus 
    });

  } catch (error) {
    console.error('DOKU webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'DOKU webhook endpoint is active' });
}