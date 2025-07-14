/**
 * PaddleOCR Client Wrapper
 * Provides OCR functionality using PaddleOCR for better accuracy
 */

// Define PaddleOCR response types
interface PaddleOCRResult {
  text: string;
  confidence: number;
  bbox: number[][];
}

interface PaddleOCRResponse {
  results: PaddleOCRResult[];
  success: boolean;
  error?: string;
}

// PaddleOCR API configuration
const PADDLE_OCR_CONFIG = {
  apiUrl: process.env.PADDLE_OCR_API_URL || 'http://localhost:5000/api/ocr',
  languages: ['en', 'ch', 'chinese_cht', 'korean', 'japan'],
};

/**
 * Convert base64 image to blob for API upload
 * @param base64Data - Base64 encoded image
 * @returns Blob object
 */
function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid base64 format');
  }
  
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : 'image/jpeg';
  const dataPart = parts[1];
  
  if (!dataPart) {
    throw new Error('No image data found');
  }
  
  const binary = atob(dataPart);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new Blob([array], { type: mime });
}

/**
 * Create an AbortController with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Process image through PaddleOCR API
 * @param base64Image - Base64 encoded image string
 * @returns Extracted text
 */
export async function runPaddleOCR(base64Image: string): Promise<string> {
  try {
    // Validate base64 image
    if (!base64Image || !base64Image.startsWith('data:image')) {
      throw new Error('Invalid image format');
    }

    // Convert to blob
    const imageBlob = base64ToBlob(base64Image);
    const formData = new FormData();
    formData.append('image', imageBlob, 'image.jpg');
    formData.append('language', 'en'); // Default language

    // Create timeout controller
    const controller = createTimeoutController(30000);

    // Call PaddleOCR API
    const response = await fetch(PADDLE_OCR_CONFIG.apiUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PaddleOCRResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'OCR processing failed');
    }

    // Extract text from results
    const extractedText = data.results
      .map(result => result.text)
      .join(' ')
      .trim();

    return extractedText;
  } catch (error) {
    console.error('PaddleOCR processing error:', error);
    
    // Fallback to local processing if API fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('Falling back to development mock');
      return 'PaddleOCR Development Mock - Body Composition Analysis Data';
    }
    
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process multiple images through PaddleOCR
 * @param base64Images - Array of base64 encoded image strings
 * @returns Array of extracted texts
 */
export async function runPaddleOCRMultiple(base64Images: string[]): Promise<string[]> {
  const results: string[] = [];
  
  for (const image of base64Images) {
    try {
      const text = await runPaddleOCR(image);
      results.push(text);
    } catch (error) {
      console.error(`Error processing image: ${error}`);
      results.push(''); // Add empty string for failed images
    }
  }
  
  return results;
}

/**
 * Local PaddleOCR setup for development/testing
 * This can be used when PaddleOCR service is not available
 */
export function createLocalPaddleOCRMock(): {
  extractText: (base64Image: string) => Promise<string>;
} {
  return {
    extractText: async (base64Image: string) => {
      // Mock response for development
      const mockResults = [
        "Body Composition Analysis\nWeight: 75.5kg\nBody Fat: 18.2%\nMuscle Mass: 58.3kg\nBMI: 23.1\nWater: 55.2%\nBone Mass: 3.8kg",
        "Segment Analysis\nRight Arm: 3.2kg\nLeft Arm: 3.1kg\nRight Leg: 12.5kg\nLeft Leg: 12.3kg\nTrunk: 35.4kg",
        "Obesity Data\nBMI: 23.1\nBody Fat: 18.2%\nVisceral Fat: 8.5\nBMR: 1850kcal\nMetabolic Age: 28\nWaist-Hip Ratio: 0.85",
        "Suggestions\nBody Type: Mesomorph\nTarget Weight: 72.0kg\nDaily Calorie: 2100kcal\nExercise: Cardio 3x/week\nDiet: Reduce carbs by 15%"
      ];
      
      // Return mock data based on image content
      const randomIndex = Math.floor(Math.random() * mockResults.length);
      return mockResults[randomIndex];
    }
  };
}

// Configuration for different PaddleOCR deployments
export const PaddleOCRConfig = {
  /**
   * Update PaddleOCR API URL
   * @param url - New API endpoint URL
   */
  setApiUrl: (url: string) => {
    if (typeof window === 'undefined') {
      // Server-side configuration
      process.env.PADDLE_OCR_API_URL = url;
    } else {
      // Client-side configuration (for development)
      console.warn('PaddleOCR API URL should be set via environment variables in production');
    }
  },

  /**
   * Get current API URL
   */
  getApiUrl: (): string => {
    return process.env.PADDLE_OCR_API_URL || PADDLE_OCR_CONFIG.apiUrl;
  },

  /**
   * Check if PaddleOCR service is available
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      const controller = createTimeoutController(5000);
      const response = await fetch(PADDLE_OCR_CONFIG.apiUrl + '/health', {
        method: 'GET',
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// Export configuration for external use
export default {
  runPaddleOCR,
  runPaddleOCRMultiple,
  createLocalPaddleOCRMock,
  PaddleOCRConfig
};