# OCR & AI Model Integration Setup Guide

This guide provides instructions for setting up the OCR and AI-powered body composition tracking system.

## Overview
The system processes body composition scale printout images through OCR, parses the data, enhances it with AI insights, and stores it in the database.

## Architecture
- **Frontend**: OCRUploadAndEditForm component with image upload, preview, and editable forms
- **OCR Engine**: Tesseract.js for text extraction from images
- **AI Enhancement**: OpenAI/compatible API for intelligent insights
- **Database**: Prisma with PostgreSQL for structured storage

## Files Created/Modified

### Backend Components
- [`src/server/api/routers/tracking.ts`](src/server/api/routers/tracking.ts) - tRPC router with OCR & AI endpoints
- [`src/server/utils/ocrParser.ts`](src/server/utils/ocrParser.ts) - OCR text parser utility
- [`src/server/utils/aiService.ts`](src/server/utils/aiService.ts) - AI enhancement service
- [`src/lib/ocrClient.ts`](src/lib/ocrClient.ts) - OCR client wrapper

### Frontend Components
- [`src/components/OCRUploadAndEditForm.tsx`](src/components/OCRUploadAndEditForm.tsx) - Main UI component
- [`prisma/schema.prisma`](prisma/schema.prisma) - Added TrackingUser model

## Setup Instructions

### 1. Environment Variables
Add the following to your `.env` file:
```bash
# AI Service Configuration
AI_API_KEY=your_openai_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4-turbo-preview
```

### 2. Database Migration
Run the following commands to update your database:
```bash
npx prisma migrate dev --name add_tracking_user
npx prisma generate
```

### 3. Install Dependencies
```bash
npm install tesseract.js
```

### 4. Usage Example
```typescript
// In your page/component
import { OCRUploadAndEditForm } from "@/components/OCRUploadAndEditForm";

export default function TrackingPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Body Composition Tracking</h1>
      <OCRUploadAndEditForm />
    </div>
  );
}
```

## API Endpoints

### extractOCR
- **Method**: POST
- **Input**: `{ images: string[], enhanceWithAI?: boolean }`
- **Output**: `{ success: boolean, data: ParsedOCRData, rawText: string, aiEnhanced: boolean }`

### saveTracking
- **Method**: POST
- **Input**: `{ composition, segment, obesity, suggestion, rawText }`
- **Output**: `{ success: boolean, data: TrackingUser }`

## Data Structure

### Parsed OCR Data
```typescript
{
  composition: {
    bmi?: number;
    bmr?: number;
    vfa?: number;
    bodyFat?: number;
    muscleMass?: number;
    waterPercentage?: number;
    // ... additional fields
  },
  segment: {
    rightArm?: number;
    leftArm?: number;
    trunk?: number;
    rightLeg?: number;
    leftLeg?: number;
    // ... additional fields
  },
  obesity: {
    visceralFat?: number;
    subcutaneousFat?: number;
    totalBodyFat?: number;
    // ... additional fields
  },
  suggestion: {
    recommendations?: string[];
    targetWeight?: number;
    targetBMI?: number;
    exerciseRecommendations?: string[];
    dietaryAdvice?: string[];
    // ... AI-enhanced fields
  }
}
```

## Testing Checklist

- [ ] Upload single image and verify OCR extraction
- [ ] Upload multiple images and verify data merging
- [ ] Test AI enhancement with valid API key
- [ ] Test fallback behavior without AI API key
- [ ] Save tracking data to database
- [ ] View tracking history
- [ ] Edit existing tracking records
- [ ] Delete tracking records

## Troubleshooting

### Common Issues

1. **TypeScript errors about `trackingUser`**
   - Solution: Run `npx prisma generate` to regenerate Prisma client

2. **OCR not extracting data**
   - Check image quality and ensure text is clearly visible
   - Verify supported image formats (PNG, JPG, JPEG)

3. **AI enhancement failing**
   - Check AI_API_KEY environment variable
   - Verify internet connectivity
   - Check API rate limits

4. **Database connection errors**
   - Ensure PostgreSQL is running
   - Verify DATABASE_URL in environment variables
   - Run pending migrations with `npx prisma migrate dev`

## Performance Optimization

- Images are limited to 10MB for processing
- Multiple images are processed sequentially
- AI enhancement can be disabled via `enhanceWithAI: false`
- Raw OCR text is stored for future reference

## Security Notes

- All endpoints are protected with authentication
- Users can only access their own tracking data
- File type validation prevents non-image uploads
- Base64 encoding prevents direct file system access