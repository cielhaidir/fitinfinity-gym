// src/types/doku.ts

export interface DokuPaymentNotification {
  order: {
    invoice_number: string;
    amount: number;
    currency: string;
    status: DokuPaymentStatus;
  };
  payment: {
    payment_method_type: string;
    payment_method: string;
    payment_reference: string;
  };
  transaction: {
    status: string;
    timestamp: string;
  };
}

export type DokuPaymentStatus = 
  | 'INITIATED'   // Payment has been initiated
  | 'PENDING'     // Waiting for payment
  | 'COMPLETED'   // Payment successful
  | 'CANCELLED'   // Payment cancelled by user
  | 'FAILED'      // Payment failed
  | 'EXPIRED'     // Payment expired
  | 'REFUNDED'    // Payment refunded
  ;

export interface DokuStatusResponse {
  order: {
    invoice_number: string;
    amount: number;
    status: DokuPaymentStatus;
  };
  payment: {
    payment_method_type: string;
    payment_method: string;
    payment_reference: string;
  };
}

// Map Doku payment status to our system's payment status
export const mapDokuStatus = (dokuStatus: DokuPaymentStatus): PaymentStatus => {
  const statusMap: Record<DokuPaymentStatus, PaymentStatus> = {
    'INITIATED': 'PENDING',
    'PENDING': 'PENDING',
    'COMPLETED': 'SUCCESS',
    'CANCELLED': 'CANCELED',
    'FAILED': 'FAILED',
    'EXPIRED': 'EXPIRED',
    'REFUNDED': 'REFUNDED',
  };
  return statusMap[dokuStatus] || 'PENDING';
};

// Importing PaymentStatus type from Prisma
import { PaymentStatus } from '@prisma/client';