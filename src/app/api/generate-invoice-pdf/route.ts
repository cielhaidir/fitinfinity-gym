import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceData } = body;

    console.log('Generating invoice for:', invoiceData.memberName);

    // Read images and convert to base64
    const publicPath = path.join(process.cwd(), 'public');
    const headerImagePath = path.join(publicPath, 'assets', 'invoice', 'Header.png');
    const infoImagePath = path.join(publicPath, 'assets', 'invoice', 'Info.png');
    const footerImagePath = path.join(publicPath, 'assets', 'invoice', 'Footer.png');

    let headerBase64 = '';
    let infoBase64 = '';
    let footerBase64 = '';

    try {
      const headerBuffer = fs.readFileSync(headerImagePath);
      headerBase64 = `data:image/png;base64,${headerBuffer.toString('base64')}`;
    } catch (e) {
      console.error('Header image not found:', e);
    }

    try {
      const infoBuffer = fs.readFileSync(infoImagePath);
      infoBase64 = `data:image/png;base64,${infoBuffer.toString('base64')}`;
    } catch (e) {
      console.error('Info image not found:', e);
    }

    try {
      const footerBuffer = fs.readFileSync(footerImagePath);
      footerBase64 = `data:image/png;base64,${footerBuffer.toString('base64')}`;
    } catch (e) {
      console.error('Footer image not found:', e);
    }

    // Create HTML template with base64 images
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Fit Infinity</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #333;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            min-height: 100vh;
          }

          .invoice-header img,
          .invoice-footer img {
            width: 100%;
            display: block;
          }

          .invoice-main {
            padding: 30px 40px;
          }
          
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            align-items: flex-start;
          }
          
          .contact-info img {
            max-width: 250px;
          }

          .billed-to {
            text-align: left;
          }
          
          .billed-to h3 {
            margin: 0;
            font-size: 16px;
            color: #888;
            font-weight: normal;
          }

          .billed-to p {
            margin: 5px 0 0;
            font-size: 20px;
            font-weight: bold;
            color: #333;
          }

          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          .invoice-table th, .invoice-table td {
            padding: 12px 15px;
            text-align: left;
          }

          .invoice-table thead {
            background-color: #d8e06c !important;
            color: #333 !important;
          }

          .invoice-table thead th {
            font-weight: bold;
          }
          
          .invoice-table tbody tr {
            border-bottom: 1px solid #e0e0e0;
          }

          .invoice-table tbody td {
            font-size: 15px;
            color: #333;
          }

          .invoice-table tbody td strong {
            color: #333;
          }

          .invoice-summary {
            background-color: #d8e06c !important;
            padding: 15px;
            text-align: right;
            font-size: 16px;
          }
          
          .invoice-summary p {
            margin: 8px 0;
            color: #333 !important;
          }

          .invoice-summary .total {
            font-weight: bold;
            font-size: 18px;
          }
          
          .payment-info, .terms-conditions {
            margin-top: 40px;
          }

          .payment-info h4, .terms-conditions h4 {
            color: #d8e06c;
            font-size: 18px;
            margin-bottom: 5px;
          }
          
          .payment-info p, .terms-conditions p {
            margin-top: 0;
            font-size: 14px;
            color: #555;
          }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-container { min-height: auto; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${headerBase64 ? `<header class="invoice-header">
            <img src="${headerBase64}" alt="Invoice Header">
          </header>` : ''}

          <main class="invoice-main">
            <section class="invoice-details">
              ${infoBase64 ? `<div class="contact-info">
                <img src="${infoBase64}" alt="Contact Information">
              </div>` : ''}
              <div class="billed-to">
                <h3>Tagihan Kepada :</h3>
                <p>${invoiceData.memberName}</p>
              </div>
            </section>

            <table class="invoice-table">
              <thead>
                <tr>
                  <th>Deskripsi</th>
                  <th>Tipe</th>
                  <th>Durasi</th>
                  <th>Harga</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${invoiceData.packageName}</strong>
                    ${invoiceData.trainerName ? `<div style="font-size: 13px; color: #666;">Trainer: ${invoiceData.trainerName}</div>` : ''}
                  </td>
                  <td>${invoiceData.subsType === "gym" ? "Gym Membership" : "Personal Training"}</td>
                  <td>${invoiceData.duration ? `${invoiceData.duration} Sesi` : "N/A"}</td>
                  <td>Rp ${invoiceData.amount.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>

            <div class="invoice-summary">
              <p>Diskon : Rp ${Math.floor(invoiceData.amount * 0.1).toLocaleString('id-ID')} (10%)</p>
              <p class="total">Total : Rp ${Math.floor(invoiceData.amount * 0.9).toLocaleString('id-ID')}</p>
            </div>

            <section class="payment-info">
              <h4>Info Pembayaran :</h4>
              <p><strong>${invoiceData.paymentMethod || "QRIS"}</strong></p>
            </section>

            <section class="terms-conditions">
              <h4>Syarat & Ketentuan</h4>
              <p>Pembayaran yang sudah dibayarkan tidak bisa dikembalikan.</p>
            </section>
          </main>

          ${footerBase64 ? `<footer class="invoice-footer">
            <img src="${footerBase64}" alt="Invoice Footer">
          </footer>` : ''}
        </div>
        
        <script>
          // Trigger print dialog automatically
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    // Return HTML content that will trigger browser print
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Error generating invoice HTML:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice HTML', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}