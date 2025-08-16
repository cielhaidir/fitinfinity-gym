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

interface InvoiceData {
  id: string;
  memberName: string;
  memberEmail: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  startDate: string | null;
  endDate?: string | null;
  createdAt: string;
  subsType: string;
  trainerName?: string;
  duration? : number;
  discount?: number; // discount amount
  discountPercent?: number; // discount percentage
  voucherCode?: string; // voucher code if any
  originalPrice?: number; // original price before discount
}

interface InvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData | null;
}

export function InvoiceGenerator({ isOpen, onClose, invoiceData }: InvoiceGeneratorProps) {
  if (!invoiceData) return null;

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

  const generatePDF = async () => {
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

    // Invoice Details
    pdf.setFontSize(12);
    pdf.setTextColor(33, 33, 33);

    // Bill To section
    pdf.text('Bill To:', 10, 50);
    pdf.setFontSize(11);
    pdf.text(invoiceData.memberName, 10, 57);
    pdf.text(invoiceData.memberEmail, 10, 64);

    // Invoice Info section
    pdf.setFontSize(11);
    pdf.text('Invoice Details:', pageWidth - 60, 50);
    pdf.text(`Date: ${formatDate(invoiceData.createdAt)}`, pageWidth - 60, 57);

    // Format duration string
    const startDateStr = formatDate(invoiceData.startDate);
    const endDateStr = formatDate(invoiceData.endDate);
    const durationStr = invoiceData.duration;

    // Subscription Details Table (will use originalPrice calculated later)
    const tableData = [[
      invoiceData.packageName + (invoiceData.trainerName ? `\nTrainer: ${invoiceData.trainerName}` : ''),
      invoiceData.subsType === "gym" ? "Gym Membership" : "Personal Training",
      durationStr || "N/A",
      formatCurrency(invoiceData.originalPrice || invoiceData.amount || 0)
    ]];

    autoTable(pdf, {
      head: [['Description', 'Type', 'Duration', 'Amount']],
      body: tableData,
      startY: 75,
      theme: 'striped',
      styles: {
      fontSize: 10,
      cellPadding: 5,
      },
      headStyles: {
      fillColor: [181, 191, 71], // infinity color
      textColor: [255, 255, 255],
      fontStyle: 'bold'
      },
      // Stretch table to page width
      margin: { left: 10, right: 10 },
      tableWidth: pageWidth - 20,
    });

    // Payment Information
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    
    pdf.text('Payment Information:', 10, finalY);
    pdf.text(`Payment Method: ${invoiceData.paymentMethod || "Manual Payment"}`, 10, finalY + 7);
    pdf.text(`Payment Status: ${getStatusLabel(invoiceData.paymentStatus)}`, 10, finalY + 14);

    // Calculate original price and discount
    const originalPrice = invoiceData.originalPrice || invoiceData.amount;
    const discountAmount = invoiceData.discount || 0;
    const discountPercent = invoiceData.discountPercent || 0;
    const voucherCode = invoiceData.voucherCode || '';
    
    // Calculate actual discount amount if percentage is provided
    const actualDiscountAmount = discountAmount > 0 ? discountAmount : 
      (discountPercent > 0 ? (originalPrice * discountPercent / 100) : 0);
    
    // If no explicit discount but originalPrice > amount, calculate discount from difference
    const inferredDiscount = (originalPrice > invoiceData.amount) ? (originalPrice - invoiceData.amount) : 0;
    const finalDiscountAmount = actualDiscountAmount > 0 ? actualDiscountAmount : inferredDiscount;
    
    const finalTotal = originalPrice - finalDiscountAmount;

    // Total Section
    pdf.text('Subtotal:', pageWidth - 70, finalY);
    pdf.text(formatCurrency(originalPrice), pageWidth - 10, finalY, { align: 'right' });
    
    // Show discount if any
    if (finalDiscountAmount > 0) {
      let discountLabel = 'Discount:';
      if (voucherCode) {
        discountLabel = `Voucher (${voucherCode}):`;
      } else if (discountPercent > 0) {
        discountLabel = `Discount (${discountPercent}%):`;
      }
      
      pdf.text(discountLabel, pageWidth - 70, finalY + 7);
      pdf.text(`-${formatCurrency(finalDiscountAmount)}`, pageWidth - 10, finalY + 7, { align: 'right' });
      
      pdf.setFontSize(12);
      pdf.text('Total:', pageWidth - 70, finalY + 14);
      pdf.text(formatCurrency(finalTotal), pageWidth - 10, finalY + 14, { align: 'right' });
    } else {
      pdf.setFontSize(12);
      pdf.text('Total:', pageWidth - 70, finalY + 7);
      pdf.text(formatCurrency(finalTotal), pageWidth - 10, finalY + 7, { align: 'right' });
    }

    // Add footer image (full width at bottom)
    try {
      const footerImg = new Image();
      footerImg.src = '/assets/invoice/Footer.png';
      await new Promise((resolve) => {
        footerImg.onload = resolve;
      });
      pdf.addImage(footerImg, 'PNG', 0, pageHeight - 40, pageWidth, 40);
    } catch (error) {
      console.error('Error loading footer image:', error);
    }

    // Generation timestamp
    pdf.setFontSize(8);
    pdf.setTextColor(102, 102, 102);
    pdf.text(
      `Generated on: ${new Date().toLocaleString('id-ID')}`, 
      pageWidth / 2, 
      pageHeight - 5, 
      { align: 'center' }
    );

    // Save PDF
    pdf.save(`invoice-${invoiceData.id}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice PDF
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to generate and download the invoice as a PDF file.
          </p>
          
          <Button onClick={generatePDF} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Invoice PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}