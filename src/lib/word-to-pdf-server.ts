import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

interface TemplateData {
  [key: string]: string | number | boolean;
}

export class WordToPDFConverter {
  static async generatePDFFromTemplate(data: TemplateData, filename: string): Promise<void> {
    try {
      // Call server API to convert Word template to PDF
      const response = await fetch('/api/word-to-pdf-convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          templateData: data, 
          filename: filename 
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Get PDF blob from response
      const pdfBlob = await response.blob();
      
      // Download PDF directly
      saveAs(pdfBlob, filename);

    } catch (error) {
      console.error('Error generating PDF from Word template:', error);
      throw error;
    }
  }

  static async createInvoicePDF(data: TemplateData, filename: string): Promise<void> {
    await WordToPDFConverter.generatePDFFromTemplate(data, filename);
  }
}