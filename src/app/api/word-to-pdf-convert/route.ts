import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import mammoth from 'mammoth';

// Function to convert Word document to HTML using mammoth for better formatting preservation
async function convertWordDocumentToHTML(processedDocBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer: processedDocBuffer });
    
    // Add PDF-specific styling to the converted HTML
    const styledHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 1.5cm 2cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
            word-wrap: break-word;
        }
        /* Preserve mammoth's default styling while adding PDF-specific improvements */
        p {
            margin: 0.5em 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        td, th {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
        }
        /* Ensure content fits well on PDF page */
        .document-content {
            max-width: 100%;
            overflow-wrap: break-word;
        }
        /* Style for better PDF rendering */
        strong, b {
            font-weight: bold;
        }
        em, i {
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="document-content">
        ${result.value}
    </div>
</body>
</html>`;

    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth conversion messages:', result.messages);
    }

    return styledHTML;
  } catch (error) {
    console.error('Error converting Word to HTML with mammoth:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(process.cwd(), 'temp');
  let tempWordPath: string | null = null;
  let browser = null;
  
  try {
    const { templateData, filename } = await request.json();

    console.log('Processing invoice with data:', {
      memberName: templateData.memberName,
      packageName: templateData.packageName,
      amount: templateData.amount
    });

    // Step 1: Create temp directory if it doesn't exist
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    // Step 2: Process Word template with real data
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'invoice-template.docx');
    
    let processedDocBuffer: Buffer;
    
    try {
      // Read the Word template file
      const templateFile = await fs.readFile(templatePath);
      
      // Process Word template with data
      const zip = new PizZip(templateFile);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true,
      });

      // Set the data
      doc.setData(templateData);
      doc.render();

      // Get the processed document buffer
      processedDocBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      console.log('Word template processed successfully, buffer size:', processedDocBuffer.length);
      
    } catch (error) {
      console.error('Error processing Word template:', error);
      throw new Error(`Failed to process Word template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 3: Save the processed Word document temporarily (as requested by user)
    const timestamp = Date.now();
    tempWordPath = path.join(tempDir, `invoice-${timestamp}.docx`);

    await fs.writeFile(tempWordPath, processedDocBuffer);
    console.log('Word document saved temporarily to:', tempWordPath);

    // Step 4: Convert Word document to HTML using mammoth (preserves original formatting)
    const htmlContent = await convertWordDocumentToHTML(processedDocBuffer);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;
    
    console.log('PDF generated successfully, size:', pdfBuffer.length);

    // Step 5: Clean up temp Word file (as requested - don't download to user)
    await fs.unlink(tempWordPath).catch(err => console.log('Error cleaning up Word file:', err));

    // Step 6: Return PDF for download
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in document processing:', error);
    
    // Clean up resources
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    if (tempWordPath) {
      await fs.unlink(tempWordPath).catch(err => console.log('Error cleaning up Word file:', err));
    }
    
    return NextResponse.json(
      {
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}