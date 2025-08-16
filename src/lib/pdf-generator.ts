import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  invoiceId: string;
  memberName: string;
  memberEmail: string;
  packageName: string;
  originalPrice?: string;
  discount?: string;
  discountPercentage?: string;
  amount: string;
  trainerName?: string;
  subscriptionType: string;
  duration?: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  paymentStatus: string;
  createdDate: string;
  generatedDate: string;
  subtotal: string;
  tax: string;
  total: string;
}

export class PDFGenerator {
  static async generateInvoicePDF(invoiceData: InvoiceData): Promise<void> {
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
      headerImg.src = '/assets/header-inv.png';
      await new Promise((resolve, reject) => {
        headerImg.onload = resolve;
        headerImg.onerror = reject;
      });
      pdf.addImage(headerImg, 'PNG', 0, 0, pageWidth, 40);
    } catch (error) {
      console.warn('Header image not found, continuing without it');
      // Add text header instead
      pdf.setFontSize(20);
      pdf.setTextColor(181, 191, 71);
      pdf.text('FIT INFINITY', pageWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text('Fitness Center & Personal Training', pageWidth / 2, 30, { align: 'center' });
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
    pdf.text(`Date: ${invoiceData.createdDate}`, pageWidth - 60, 57);
    pdf.text(`Status: ${invoiceData.paymentStatus}`, pageWidth - 60, 64);

    // Determine if we have discount info
    const hasDiscount = invoiceData.discount && invoiceData.discount !== "Rp 0" && invoiceData.discountPercentage && invoiceData.discountPercentage !== "0%";

    // Subscription Details Table
    const tableData = hasDiscount ? [
      [
        invoiceData.packageName + (invoiceData.trainerName && invoiceData.trainerName !== "N/A" ? `\nTrainer: ${invoiceData.trainerName}` : ''),
        invoiceData.subscriptionType,
        invoiceData.duration || "N/A",
        invoiceData.originalPrice || invoiceData.amount,
        invoiceData.discount || "Rp 0",
        invoiceData.amount
      ]
    ] : [
      [
        invoiceData.packageName + (invoiceData.trainerName && invoiceData.trainerName !== "N/A" ? `\nTrainer: ${invoiceData.trainerName}` : ''),
        invoiceData.subscriptionType,
        invoiceData.duration || "N/A",
        invoiceData.amount
      ]
    ];

    const tableHeaders = hasDiscount ? 
      [['Description', 'Type', 'Duration', 'Original Price', 'Discount', 'Final Price']] :
      [['Description', 'Type', 'Duration', 'Amount']];

    autoTable(pdf, {
      head: tableHeaders,
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
    pdf.text(`Payment Method: ${invoiceData.paymentMethod}`, 10, finalY + 7);
    pdf.text(`Payment Status: ${invoiceData.paymentStatus}`, 10, finalY + 14);
    
    if (hasDiscount) {
      pdf.text(`Period: ${invoiceData.startDate} - ${invoiceData.endDate}`, 10, finalY + 21);
    }

    // Financial Summary
    let summaryY = finalY + (hasDiscount ? 35 : 28);
    
    if (hasDiscount) {
      pdf.text('Financial Summary:', 10, summaryY);
      pdf.text('Original Price:', pageWidth - 80, summaryY);
      pdf.text(invoiceData.originalPrice || invoiceData.amount, pageWidth - 10, summaryY, { align: 'right' });
      
      pdf.text(`Discount (${invoiceData.discountPercentage}):`, pageWidth - 80, summaryY + 7);
      pdf.text(`-${invoiceData.discount}`, pageWidth - 10, summaryY + 7, { align: 'right' });
      
      summaryY += 14;
    }

    pdf.text('Subtotal:', pageWidth - 70, summaryY);
    pdf.text(invoiceData.subtotal, pageWidth - 10, summaryY, { align: 'right' });
    
    pdf.text('Tax:', pageWidth - 70, summaryY + 7);
    pdf.text(invoiceData.tax, pageWidth - 10, summaryY + 7, { align: 'right' });
    
    pdf.setFontSize(12);
    pdf.text('Total:', pageWidth - 70, summaryY + 14);
    pdf.text(invoiceData.total, pageWidth - 10, summaryY + 14, { align: 'right' });

    // Add footer image (full width at bottom)
    try {
      const footerImg = new Image();
      footerImg.src = '/assets/footer-inv.png';
      await new Promise((resolve, reject) => {
        footerImg.onload = resolve;
        footerImg.onerror = reject;
      });
      pdf.addImage(footerImg, 'PNG', 0, pageHeight - 40, pageWidth, 40);
    } catch (error) {
      console.warn('Footer image not found, continuing without it');
    }

    // Generation timestamp
    pdf.setFontSize(8);
    pdf.setTextColor(102, 102, 102);
    pdf.text(
      `Generated on: ${invoiceData.generatedDate}`, 
      pageWidth / 2, 
      pageHeight - 5, 
      { align: 'center' }
    );

    // Save PDF
    pdf.save(`invoice-${invoiceData.invoiceId}.pdf`);
  }
}