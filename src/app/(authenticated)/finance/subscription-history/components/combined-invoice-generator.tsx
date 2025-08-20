"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CombinedInvoiceData {
  id: string;
  memberId: string;
  packageId: string;
  trainerId: string | null;
  fcId: string | null;
  subsType: string;
  duration: number;
  sessions: number | null;
  totalPayment: number;
  paymentMethod: string;
  filePath: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  balanceId: number;
  salesId: string | null;
  salesType: string | null;
  package: {
    id: string;
    name: string;
    description: string;
    price: number;
    point: number;
    isActive: boolean;
    type: string;
    sessions: number | null;
    day: number;
    maxUsers: number | null;
    isGroupPackage: boolean;
    groupPriceType: string | null;
    createdAt: string;
    updatedAt: string;
  };
  trainer: {
    id: string;
    userId: string;
    description: string;
    expertise: string | null;
    image: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    user: {
      name: string;
    };
  } | null;
  member: {
    id: string;
    userId: string;
    registerDate: string;
    rfidNumber: string | null;
    isActive: boolean;
    createdBy: string | null;
    fcId: string | null;
    revokedAt: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: string | null;
      password: string | null;
      address: string | null;
      phone: string | null;
      birthDate: string | null;
      idNumber: string | null;
      image: string | null;
      resetToken: string | null;
      resetTokenExpiry: string | null;
      createdBy: string | null;
      createdAt: string;
      updatedAt: string;
      point: number;
      height: number | null;
      weight: number | null;
      gender: string | null;
    };
  };
  subscriptionId: string;
  isOnlinePayment: boolean;
}

interface CombinedInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: CombinedInvoiceData[] | null;
}

export function CombinedInvoiceGenerator({ isOpen, onClose, invoiceData }: CombinedInvoiceGeneratorProps) {
  console.log('Invoice Data:', invoiceData);
  if (!invoiceData || invoiceData.length === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
      case "ACCEPTED":
        return "PAID";
      case "PENDING":
        return "PENDING";
      default:
        return "UNPAID";
    }
  };

  const generateCombinedPDF = async () => {
    // Create PDF with no margins
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });
    
    // Remove default margins
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add header image (full width)
    try {
      const headerImg = new Image();
      headerImg.src = '/assets/invoice/Header.png';
      await new Promise((resolve) => {
        headerImg.onload = resolve;
      });
      pdf.addImage(headerImg, 'PNG', 0, 0, pageWidth, 40);
    } catch (error) {
      console.error('Error loading header image:', error);
    }

    // Combined Invoice Details
    pdf.setFontSize(14);
    pdf.setTextColor(33, 33, 33);
    pdf.setFont(undefined, 'bold');
    pdf.text('INVOICE', pageWidth / 2, 50, { align: 'center' });
    pdf.setFont(undefined, 'normal');

    // Get member info from first transaction (assuming all are for same member)
    const firstTransaction = invoiceData[0];
    if (!firstTransaction) return;
    
    // Bill To section
    pdf.setFontSize(12);
    pdf.text('Bill To:', 10, 60);
    pdf.setFontSize(11);
    pdf.text(firstTransaction.member?.user?.name || 'N/A', 10, 67);
    pdf.text(firstTransaction.member?.user?.email || 'N/A', 10, 74);

    // Invoice Info section
    pdf.setFontSize(11);
    pdf.text('Invoice Details:', pageWidth - 60, 60);
    pdf.text(`Date: ${formatDate(new Date().toISOString())}`, pageWidth - 60, 67);
    pdf.text(`Transactions: ${invoiceData.length}`, pageWidth - 60, 74);

    // Prepare table data for all transactions
    const tableData = invoiceData.map((transaction) => [
      `${transaction.package.name || 'N/A'}${transaction.trainer?.user?.name ? `\nTrainer: ${transaction.trainer.user.name}` : ''}`,
      transaction.subsType === "gym" ? "Gym Membership" : "Personal Trainer",
      `${transaction.duration || "N/A"} ${transaction.subsType === "gym" ? "days" : "sessions"}`,
      formatCurrency(transaction.totalPayment || 0)
    ]);

    // Add transactions table
    autoTable(pdf, {
      head: [['Description', 'Type', 'Duration', 'Amount']],
      body: tableData,
      startY: 85,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [181, 191, 71], // infinity color
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      margin: { left: 10, right: 10 },
      tableWidth: pageWidth - 20,
    });

    // Calculate totals
    const subtotal = invoiceData.reduce((sum, transaction) =>
      sum + (transaction.package.price || 0), 0);
    
    const totalDiscount = invoiceData.reduce((sum, transaction) => {
      const originalPrice = transaction.package.price || 0;
      const paidAmount = transaction.totalPayment || 0;
      const discount = originalPrice > paidAmount ? (originalPrice - paidAmount) : 0;
      return sum + discount;
    }, 0);
    
    const finalTotal = invoiceData.reduce((sum, transaction) =>
      sum + (transaction.totalPayment || 0), 0);

    // Payment Information and Totals
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    
    pdf.text('Payment Information:', 10, finalY);
    const paymentMethods = [...new Set(invoiceData.map(t => t.paymentMethod))].join(', ');
    pdf.text(`Payment Methods: ${paymentMethods}`, 10, finalY + 7);
    pdf.text(`Status: ${getStatusLabel(firstTransaction.paymentStatus)}`, 10, finalY + 14);

    // Total Section
    pdf.text('Subtotal:', pageWidth - 70, finalY);
    pdf.text(formatCurrency(subtotal), pageWidth - 10, finalY, { align: 'right' });
    
    // Show discount if any
    if (totalDiscount > 0) {
      pdf.text('Total Discount:', pageWidth - 70, finalY + 7);
      pdf.text(`-${formatCurrency(totalDiscount)}`, pageWidth - 10, finalY + 7, { align: 'right' });
      
      pdf.setFontSize(12);
      pdf.text('Grand Total:', pageWidth - 70, finalY + 14);
      pdf.text(formatCurrency(finalTotal), pageWidth - 10, finalY + 14, { align: 'right' });
    } else {
      pdf.setFontSize(12);
      pdf.text('Grand Total:', pageWidth - 70, finalY + 7);
      pdf.text(formatCurrency(finalTotal), pageWidth - 10, finalY + 7, { align: 'right' });
    }

    // Add footer image (full width at bottom)
    try {
      const footerImg = new Image();
      footerImg.src = '/assets/invoice/Footer.png';
      await new Promise((resolve) => {
        footerImg.onload = resolve;
      });
      pdf.addImage(footerImg, 'PNG', 0, pageHeight - 20, pageWidth, 20);
    } catch (error) {
      console.error('Error loading footer image:', error);
    }

    // Generation timestamp
    pdf.setFontSize(8);
    pdf.setTextColor(102, 102, 102);
    pdf.text(
      `Generated on: ${new Date().toLocaleString('id-ID')}`, 
      pageWidth / 2, 
      pageHeight - 2, 
      { align: 'center' }
    );

    // Save PDF
    const transactionIds = invoiceData.map(t => t.id).join('-');
    pdf.save(`combined-invoice-${transactionIds.substring(0, 20)}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Combined Invoice PDF
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium">Selected Transactions:</p>
            <p className="text-sm text-muted-foreground">{invoiceData.length} transactions</p>
            <p className="text-sm text-muted-foreground">
              Member: {invoiceData[0]?.member?.user?.name || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground">
              Total Amount: {formatCurrency(
                invoiceData.reduce((sum, t) => sum + (t.totalPayment || 0), 0)
              )}
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Click the button below to generate and download the combined invoice as a PDF file.
          </p>
          
          <Button onClick={generateCombinedPDF} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Combined Invoice PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}