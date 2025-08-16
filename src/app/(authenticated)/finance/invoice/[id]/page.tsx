"use client";

import React, { useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface InvoiceData {
  id: string;
  memberName: string;
  memberEmail: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  subsType: string;
  trainerName?: string;
  duration: number;
}

export default function InvoicePage() {
  const params = useParams();
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  // Get invoice data from URL parameters or localStorage
  const getInvoiceData = (): InvoiceData | null => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(`invoice-${params.id}`);
      return data ? JSON.parse(data) : null;
    }
    return null;
  };

  const invoiceData = getInvoiceData();

  if (!invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invoice Not Found</h1>
          <p className="text-gray-600">The requested invoice could not be found.</p>
          <Button 
            onClick={() => window.close()} 
            className="mt-4"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      } as any);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Invoice-${invoiceData.memberName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Action Buttons */}
      <div className="fixed top-4 right-4 z-10 flex gap-2 no-print">
        <Button onClick={downloadPDF} className="bg-green-600 hover:bg-green-700">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={printInvoice} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Invoice Container */}
      <div className="container mx-auto max-w-4xl">
        <div ref={invoiceRef} className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <header className="text-center border-b-4 border-[#d8e06c]">
            <div className="bg-[#d8e06c] py-8 px-6">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">FIT INFINITY</h1>
              <p className="text-lg text-gray-600">Invoice Pembayaran</p>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-8">
            {/* Invoice Details */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-lg text-gray-600 font-normal mb-2">Tagihan Kepada :</h3>
                <p className="text-2xl font-bold text-gray-800">{invoiceData.memberName}</p>
                <p className="text-gray-600">{invoiceData.memberEmail}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 mb-1">Invoice #: <span className="font-semibold">{invoiceData.id}</span></p>
                <p className="text-gray-600">Tanggal: <span className="font-semibold">{new Date().toLocaleDateString('id-ID')}</span></p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-[#d8e06c] text-gray-800 p-4 text-left font-bold border">Deskripsi</th>
                    <th className="bg-[#d8e06c] text-gray-800 p-4 text-left font-bold border">Tipe</th>
                    <th className="bg-[#d8e06c] text-gray-800 p-4 text-left font-bold border">Durasi</th>
                    <th className="bg-[#d8e06c] text-gray-800 p-4 text-left font-bold border">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 border">
                      <div>
                        <div className="font-semibold text-gray-800">{invoiceData.packageName}</div>
                        {invoiceData.trainerName && (
                          <div className="text-sm text-gray-600">Trainer: {invoiceData.trainerName}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 border text-gray-700">
                      {invoiceData.subsType === "gym" ? "Gym Membership" : "Personal Training"}
                    </td>
                    <td className="p-4 border text-gray-700">
                      {invoiceData.duration ? `${invoiceData.duration} Sesi` : "N/A"}
                    </td>
                    <td className="p-4 border text-gray-700 font-semibold">
                      Rp {invoiceData.amount.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Summary */}
            <div className="bg-[#d8e06c] p-6 text-right mb-8">
              <p className="text-gray-800 mb-2">
                Diskon : Rp {Math.floor(invoiceData.amount * 0.1).toLocaleString('id-ID')} (10%)
              </p>
              <p className="text-xl font-bold text-gray-800">
                Total : Rp {Math.floor(invoiceData.amount * 0.9).toLocaleString('id-ID')}
              </p>
            </div>

            {/* Payment Info and Terms */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-[#d8e06c] mb-3">Info Pembayaran :</h4>
                <p className="text-gray-700">
                  <strong>{invoiceData.paymentMethod || "QRIS"}</strong>
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-[#d8e06c] mb-3">Syarat & Ketentuan</h4>
                <p className="text-gray-700 text-sm">
                  Pembayaran yang sudah dibayarkan tidak bisa dikembalikan.
                </p>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-[#d8e06c] text-center py-6">
            <p className="text-gray-800 font-medium">Terima kasih telah mempercayai FIT INFINITY</p>
            <p className="text-gray-600 text-sm mt-1">Jl. Contoh No. 123, Jakarta | Tel: (021) 123-4567</p>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .container {
            max-width: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}