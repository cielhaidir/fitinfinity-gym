import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { runPaddleOCRMultiple } from "@/lib/paddleOcrClient";
import { parseOCRText } from "@/server/utils/ocrParser";
import { createAIService } from "@/server/utils/aiService";
import { createAIRateLimitService, AIRequestType } from "@/server/utils/aiRateLimitService";

// Helper function to check if user has active membership
async function checkActiveMembership(db: any, userId: string) {
  return true;
// const existingActiveSubscription = await db.subscription.findFirst({
//   where: {
//     isActive: true,
//     member: {
//       userId: userId,
//     },
//   },
// });
//   if (!existingActiveSubscription) {
//     throw new TRPCError({
//       code: "FORBIDDEN",
//       message: "Active membership required to use AI features. Please contact the gym to activate your membership.",
//     });
//   }

//   return existingActiveSubscription;
}

// Note: Use 'processImage' endpoint for direct AI image analysis (recommended)
// Use 'extractOCR' endpoint only if you need OCR text extraction for legacy purposes

export const trackingRouter = createTRPCRouter({
  // Process single image directly with AI (bypassing OCR)
  processImage: protectedProcedure
    .input(
      z.object({
        image: z.string().min(1, "Image is required"), // Base64 encoded image
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user has active membership first
        await checkActiveMembership(ctx.db, ctx.session.user.id);

        const rateLimitService = createAIRateLimitService(ctx.db);
        const aiService = createAIService();

        // Execute with rate limiting
        const enhancedData = await rateLimitService.executeWithRateLimit(
          {
            userId: ctx.session.user.id,
            requestType: AIRequestType.BODY_COMPOSITION,
            endpoint: 'processImage',
            userAgent: ctx.headers?.get('user-agent') || undefined,
            ipAddress: ctx.headers?.get('x-forwarded-for') || ctx.headers?.get('x-real-ip') || undefined,
          },
          () => aiService.processImage(input.image)
        );
        
        return {
          success: true,
          data: enhancedData,
          aiEnhanced: true,
        };
      } catch (error) {
        console.error('Image processing error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: null,
          aiEnhanced: false,
        };
      }
    }),

  // Process multiple images directly with AI (bypassing OCR)
  processMultipleImages: protectedProcedure
    .input(
      z.object({
        images: z.array(z.string()).min(1, "At least one image is required"), // Base64 encoded images
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user has active membership first
        await checkActiveMembership(ctx.db, ctx.session.user.id);

        const rateLimitService = createAIRateLimitService(ctx.db);
        const aiService = createAIService();

        // Execute with rate limiting
        const enhancedData = await rateLimitService.executeWithRateLimit(
          {
            userId: ctx.session.user.id,
            requestType: AIRequestType.BODY_COMPOSITION,
            endpoint: 'processMultipleImages',
            userAgent: ctx.headers?.get('user-agent') || undefined,
            ipAddress: ctx.headers?.get('x-forwarded-for') || ctx.headers?.get('x-real-ip') || undefined,
          },
          () => aiService.processMultipleImages(input.images)
        );
        
        return {
          success: true,
          data: enhancedData,
          aiEnhanced: true,
        };
      } catch (error) {
        console.error('Multiple images processing error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: null,
          aiEnhanced: false,
        };
      }
    }),

  // Extract OCR data from multiple images with AI enhancement
  extractOCR: protectedProcedure
    .input(
      z.object({
        images: z.array(z.string()).min(1, "At least one image is required"), // Base64 encoded images
        enhanceWithAI: z.boolean().default(true), // Option to enable/disable AI enhancement
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const ocrResults = [];
        
        // Process all images through PaddleOCR
        const ocrTexts = await runPaddleOCRMultiple(input.images);
        
        for (let i = 0; i < ocrTexts.length; i++) {
          const ocrText = ocrTexts[i] || '';
          if (!ocrText.trim()) {
            console.warn(`No text extracted from image ${i + 1}`);
            continue;
          }
          
          const parsedData = parseOCRText(ocrText);
          ocrResults.push({
            rawText: ocrText,
            parsedData: parsedData
          });
        }
        
        console.log('OCR Results:', ocrResults);
        // Combine all parsed data from multiple images
        const combinedData = {
          composition: {},
          segment: {},
          obesity: {},
          suggestion: {}
        };
        
        // Combine raw text from all images
        const combinedRawText = ocrResults.map(r => r.rawText).join('\n---\n');
        
        // Merge data from all images (later images override earlier ones for same keys)
        for (const result of ocrResults) {
          Object.assign(combinedData.composition, result.parsedData.composition);
          Object.assign(combinedData.segment, result.parsedData.segment);
          Object.assign(combinedData.obesity, result.parsedData.obesity);
          Object.assign(combinedData.suggestion, result.parsedData.suggestion);
        }

        // Enhance with AI if enabled
        let enhancedData = combinedData;
        console.log('Combined OCR Data:', combinedData);
        let aiEnhanced = false;
        
        if (input.enhanceWithAI) {
          try {
            // Check if user has active membership before AI enhancement
            await checkActiveMembership(ctx.db, ctx.session.user.id);

            const rateLimitService = createAIRateLimitService(ctx.db);
            const aiService = createAIService();
            
            // Execute AI enhancement with rate limiting
            enhancedData = await rateLimitService.executeWithRateLimit(
              {
                userId: ctx.session.user.id,
                requestType: AIRequestType.BODY_COMPOSITION,
                endpoint: 'extractOCR',
                userAgent: ctx.headers?.get('user-agent') || undefined,
                ipAddress: ctx.headers?.get('x-forwarded-for') || ctx.headers?.get('x-real-ip') || undefined,
              },
              () => aiService.enhanceOCRData(combinedData)
            );
            aiEnhanced = true;
          } catch (aiError) {
            console.error('AI enhancement failed:', aiError);
            // Continue with original data if AI enhancement fails
          }
        }
        
        return {
          success: true,
          data: enhancedData,
          rawText: combinedRawText,
          rawResults: ocrResults,
          aiEnhanced,
        };
      } catch (error) {
        console.error('OCR extraction error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: null,
          rawText: null,
          rawResults: [],
          aiEnhanced: false,
        };
      }
    }),



  // Save tracking data to database
  saveTracking: protectedProcedure
    .input(
      z.object({
        composition: z.record(z.any()).optional(),
        segment: z.record(z.any()).optional(),
        obesity: z.record(z.any()).optional(),
        suggestion: z.record(z.any()).optional(),
        rawText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const trackingRecord = await ctx.db.trackingUser.create({
          data: {
            userId: ctx.session.user.id,
            composition: input.composition || {},
            segment: input.segment || {},
            obesity: input.obesity || {},
            suggestion: input.suggestion || {},
            raw_text: input.rawText || "",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        });

        return {
          success: true,
          data: trackingRecord
        };
      } catch (error) {
        console.error('Save tracking error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save tracking data',
          data: null
        };
      }
    }),

  // Get tracking history for current user
  getHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.session.user.id,
        ...(input.startDate || input.endDate ? {
          createdAt: {
            ...(input.startDate ? { gte: input.startDate } : {}),
            ...(input.endDate ? { lte: input.endDate } : {}),
          }
        } : {})
      };

      const items = await ctx.db.trackingUser.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      const total = await ctx.db.trackingUser.count({ where });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Get single tracking record by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const trackingRecord = await ctx.db.trackingUser.findFirst({
        where: { 
          id: input.id,
          userId: ctx.session.user.id, // Ensure user can only access their own records
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      if (!trackingRecord) {
        throw new Error('Tracking record not found');
      }

      return trackingRecord;
    }),

  // Update tracking record
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        composition: z.record(z.any()).optional(),
        segment: z.record(z.any()).optional(),
        obesity: z.record(z.any()).optional(),
        suggestion: z.record(z.any()).optional(),
        rawText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const trackingRecord = await ctx.db.trackingUser.updateMany({
          where: { 
            id: input.id,
            userId: ctx.session.user.id, // Ensure user can only update their own records
          },
          data: {
            composition: input.composition,
            segment: input.segment,
            obesity: input.obesity,
            suggestion: input.suggestion,
            raw_text: input.rawText,
          }
        });

        if (trackingRecord.count === 0) {
          throw new Error('Tracking record not found or access denied');
        }

        // Get the updated record
        const updatedRecord = await ctx.db.trackingUser.findFirst({
          where: { 
            id: input.id,
            userId: ctx.session.user.id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        });

        return {
          success: true,
          data: updatedRecord
        };
      } catch (error) {
        console.error('Update tracking error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update tracking data',
          data: null
        };
      }
    }),

  // Delete tracking record
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const deletedRecord = await ctx.db.trackingUser.deleteMany({
          where: { 
            id: input.id,
            userId: ctx.session.user.id, // Ensure user can only delete their own records
          }
        });

        if (deletedRecord.count === 0) {
          throw new Error('Tracking record not found or access denied');
        }

        return {
          success: true,
          message: 'Tracking record deleted successfully'
        };
      } catch (error) {
        console.error('Delete tracking error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete tracking data',
          data: null
        };
      }
    }),
});