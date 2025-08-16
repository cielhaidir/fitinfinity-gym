import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { createDefaultInvoiceTemplate } from "./create-default-template";

interface TemplateData {
  [key: string]: string | number | boolean;
}

export class WordToPDFGenerator {
  private template: ArrayBuffer | null = null;

  constructor(private templatePath: string) {}

  async loadTemplate(): Promise<void> {
    try {
      const response = await fetch(this.templatePath);
      if (!response.ok) {
        console.warn(`Template not found at ${this.templatePath}, using default template`);
        this.template = createDefaultInvoiceTemplate();
        return;
      }
      this.template = await response.arrayBuffer();
    } catch (error) {
      console.warn("Error loading template, using default template:", error);
      this.template = createDefaultInvoiceTemplate();
    }
  }

  private async generateWordDocument(data: TemplateData): Promise<Blob> {
    if (!this.template) {
      throw new Error("Template not loaded. Call loadTemplate() first.");
    }

    try {
      const zip = new PizZip(this.template);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Set template data
      doc.setData(data);

      // Render the document
      doc.render();

      // Generate blob
      return doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
    } catch (error) {
      console.error("Error generating Word document:", error);
      throw error;
    }
  }

  private async convertWordToPDF(wordBlob: Blob, filename: string): Promise<void> {
    // Since direct Word to PDF conversion in browser is complex,
    // we'll use a fallback approach: create a structured PDF based on template data
    
    // For now, we'll download the Word file and let user know to convert to PDF
    // In a production environment, you could use a server-side service
    
    saveAs(wordBlob, filename.replace('.pdf', '.docx'));
    
    // Show instruction to user
    setTimeout(() => {
      alert(`Word document downloaded as ${filename.replace('.pdf', '.docx')}. 
Please open the file and save/export as PDF for the final PDF version.`);
    }, 1000);
  }

  async generatePDFFromTemplate(data: TemplateData, filename: string): Promise<void> {
    // Load template
    await this.loadTemplate();
    
    // Generate Word document with data
    const wordBlob = await this.generateWordDocument(data);
    
    // Convert to PDF (or instruct user)
    await this.convertWordToPDF(wordBlob, filename);
  }

  static async createInvoicePDF(data: TemplateData, filename: string): Promise<void> {
    const generator = new WordToPDFGenerator("/templates/invoice-template.docx");
    await generator.generatePDFFromTemplate(data, filename);
  }
}

// Alternative: Server-side conversion approach
export class WordToPDFServerGenerator {
  static async createInvoicePDF(data: TemplateData, filename: string): Promise<void> {
    try {
      // Send to server endpoint for conversion
      const response = await fetch('/api/convert-word-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateData: data, filename }),
      });

      if (!response.ok) {
        throw new Error('Server conversion failed');
      }

      const blob = await response.blob();
      saveAs(blob, filename);
    } catch (error) {
      console.error('Server conversion failed, falling back to Word download:', error);
      // Fallback to Word template generator
      await WordToPDFGenerator.createInvoicePDF(data, filename);
    }
  }
}