import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { createDefaultInvoiceTemplate } from "./create-default-template";

interface TemplateData {
  [key: string]: string | number | boolean;
}

export class WordTemplateGenerator {
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

  generateDocument(data: TemplateData, filename: string): void {
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
      const output = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Save file
      saveAs(output, filename);
    } catch (error) {
      console.error("Error generating document:", error);
      throw error;
    }
  }

  static async createInvoice(data: TemplateData, filename: string): Promise<void> {
    const generator = new WordTemplateGenerator("/templates/invoice-template.docx");
    await generator.loadTemplate();
    generator.generateDocument(data, filename);
  }

  static async createInvoicePDF(data: TemplateData, filename: string): Promise<void> {
    // Generate Word document first, then convert to PDF
    const generator = new WordTemplateGenerator("/templates/invoice-template.docx");
    await generator.loadTemplate();
    
    // Create Word blob
    const zip = new PizZip(generator.template!);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(data);
    doc.render();

    // For now, we'll generate the Word document and let user convert manually
    // In production, you could add server-side conversion to PDF
    const output = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(output, filename.replace('.pdf', '.docx'));
  }
}