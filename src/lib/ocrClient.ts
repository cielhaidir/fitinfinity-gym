import { createWorker } from 'tesseract.js';

/**
 * OCR Client wrapper for tesseract.js
 * Handles OCR processing of images with base64 input
 */
export class OCRClient {
  private worker: Tesseract.Worker | null = null;

  /**
   * Initialize the OCR worker
   */
  async initialize(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker("eng", 1, {workerPath: "./node_modules/tesseract.js/src/worker-script/node/index.js"});
      // this.worker = await createWorker('eng', 1, {
      //   logger: m => console.log(m),
      //   errorHandler: (error) => console.error('Tesseract error:', error),
      // });
    }
  }

  /**
   * Process a single base64 image and extract text
   * @param base64Image - Base64 encoded image string
   * @returns Extracted text from the image
   */
  async extractText(base64Image: string): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      // Handle base64 data URL format by removing prefix if present
      const base64Data = base64Image.startsWith('data:') 
        ? base64Image.replace(/^data:image\/\w+;base64,/, '')
        : base64Image;
      
      // Convert base64 to buffer for tesseract processing
      const buffer = Buffer.from(base64Data, 'base64');
      
      const { data: { text } } = await this.worker!.recognize(buffer);
      return text.trim();
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple base64 images and extract text from all
   * @param base64Images - Array of base64 encoded image strings
   * @returns Array of extracted text from each image
   */
  async extractTextFromMultipleImages(base64Images: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const base64Image of base64Images) {
      try {
        const text = await this.extractText(base64Image);
        results.push(text);
      } catch (error) {
        console.error(`Failed to process image: ${error}`);
        results.push(''); // Add empty string for failed images
      }
    }
    
    return results;
  }

  /**
   * Process multiple images and return combined text
   * @param base64Images - Array of base64 encoded image strings
   * @returns Combined text from all images
   */
  async extractCombinedText(base64Images: string[]): Promise<string> {
    const textResults = await this.extractTextFromMultipleImages(base64Images);
    return textResults.filter(text => text.length > 0).join('\n\n');
  }

  /**
   * Cleanup and terminate the worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance for reuse
let ocrClientInstance: OCRClient | null = null;

/**
 * Get or create OCR client instance
 * @returns OCR client instance
 */
export function getOCRClient(): OCRClient {
  if (!ocrClientInstance) {
    ocrClientInstance = new OCRClient();
  }
  return ocrClientInstance;
}

/**
 * Utility function to run OCR on a single base64 image
 * @param base64Image - Base64 encoded image string
 * @returns Extracted text
 */
export async function runOCR(base64Image: string): Promise<string> {
  const client = getOCRClient();
  return await client.extractText(base64Image);
}

/**
 * Utility function to run OCR on multiple base64 images
 * @param base64Images - Array of base64 encoded image strings
 * @returns Combined extracted text
 */
export async function runOCRMultiple(base64Images: string[]): Promise<string> {
  const client = getOCRClient();
  return await client.extractCombinedText(base64Images);
}