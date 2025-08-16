import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { createDefaultInvoiceTemplate } from "@/lib/create-default-template";
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { templateData, filename } = await request.json();

    // Load template
    let templateBuffer: ArrayBuffer;
    try {
      const templatePath = path.join(process.cwd(), 'public', 'templates', 'invoice-template.docx');
      const templateFile = await fs.readFile(templatePath);
      templateBuffer = templateFile.buffer.slice(templateFile.byteOffset, templateFile.byteOffset + templateFile.byteLength) as ArrayBuffer;
    } catch (error) {
      console.warn('Template file not found, using default template');
      templateBuffer = createDefaultInvoiceTemplate();
    }

    // Generate Word document
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(templateData);
    doc.render();

    // Generate Word blob
    const wordBuffer = doc.getZip().generate({ type: "arraybuffer" });

    // For now, return the Word document
    // In production, you could integrate with services like:
    // - LibreOffice headless
    // - Pandoc
    // - Online conversion services
    // - Azure/AWS document conversion services

    return new NextResponse(wordBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename.replace('.pdf', '.docx')}"`,
      },
    });

  } catch (error) {
    console.error('Error in word-to-pdf conversion:', error);
    return NextResponse.json(
      { error: 'Failed to convert document' },
      { status: 500 }
    );
  }
}

// Alternative: If you have access to a conversion service
export async function POST_WITH_PDF_CONVERSION(request: NextRequest) {
  try {
    const { templateData, filename } = await request.json();

    // Load and process template (same as above)
    let templateBuffer: ArrayBuffer;
    try {
      const templatePath = path.join(process.cwd(), 'public', 'templates', 'invoice-template.docx');
      const templateFile = await fs.readFile(templatePath);
      templateBuffer = templateFile.buffer.slice(templateFile.byteOffset, templateFile.byteOffset + templateFile.byteLength) as ArrayBuffer;
    } catch (error) {
      console.warn('Template file not found, using default template');
      templateBuffer = createDefaultInvoiceTemplate();
    }

    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(templateData);
    doc.render();

    const wordBuffer = doc.getZip().generate({ type: "arraybuffer" });

    // Here you would integrate with a PDF conversion service
    // Example integrations:
    
    // 1. Using Puppeteer (if you have it set up)
    // const htmlContent = await convertWordToHTML(wordBuffer);
    // const pdfBuffer = await generatePDFFromHTML(htmlContent);
    
    // 2. Using external service
    // const pdfBuffer = await convertToPDFService(wordBuffer);
    
    // 3. Using LibreOffice headless (server setup required)
    // const pdfBuffer = await libreOfficeConvert(wordBuffer);

    // For now, return Word document with instruction
    return new NextResponse(wordBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename.replace('.pdf', '.docx')}"`,
      },
    });

  } catch (error) {
    console.error('Error in word-to-pdf conversion:', error);
    return NextResponse.json(
      { error: 'Failed to convert document' },
      { status: 500 }
    );
  }
}