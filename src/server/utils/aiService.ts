import { z } from "zod";
import { type ParsedOCRData } from "./ocrParser";

// AI Model Response Schemas
const AICompositionSchema = z.object({
  bmi: z.number().optional(),
  bmr: z.number().optional(),
  vfa: z.number().optional(),
  bodyFat: z.number().optional(),
  muscleMass: z.number().optional(),
  boneMass: z.number().optional(),
  waterPercentage: z.number().optional(),
  proteinPercentage: z.number().optional(),
  metabolicAge: z.number().optional(),
  physiqueRating: z.number().optional(),
});

const AISegmentSchema = z.object({
  rightArm: z.number().optional(),
  leftArm: z.number().optional(),
  trunk: z.number().optional(),
  rightLeg: z.number().optional(),
  leftLeg: z.number().optional(),
  muscleBalance: z.object({
    leftRight: z.number().optional(),
    upperLower: z.number().optional(),
  }).optional(),
});

const AIObesitySchema = z.object({
  visceralFat: z.number().optional(),
  subcutaneousFat: z.number().optional(),
  totalBodyFat: z.number().optional(),
  fatMassIndex: z.number().optional(),
  obesityLevel: z.enum(["underweight", "normal", "overweight", "obese"]).optional(),
  healthRisk: z.enum(["low", "moderate", "high", "very_high"]).optional(),
});

const AISuggestionSchema = z.object({
  recommendations: z.array(z.string()).optional(),
  targetWeight: z.number().optional(),
  targetBMI: z.number().optional(),
  exerciseRecommendations: z.array(z.string()).optional(),
  dietaryAdvice: z.array(z.string()).optional(),
  weeklyCalorieDeficit: z.number().optional(),
  estimatedTimeToGoal: z.string().optional(),
  priorityAreas: z.array(z.string()).optional(),
});

const AIResponseSchema = z.object({
  composition: AICompositionSchema,
  segment: AISegmentSchema,
  obesity: AIObesitySchema,
  suggestion: AISuggestionSchema,
});

export type AIEnhancedData = z.infer<typeof AIResponseSchema>;

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async enhanceOCRData(parsedData: ParsedOCRData): Promise<AIEnhancedData> {
    try {
      const prompt = this.buildPrompt(parsedData);
      
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are a professional fitness and health AI assistant. Analyze the provided body composition data and generate comprehensive insights, recommendations, and health assessments. Be specific, actionable, and evidence-based in your recommendations.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const aiContent = result.choices[0]?.message?.content;
      
      if (!aiContent) {
        throw new Error('No content received from AI model');
      }

      // Parse the AI response
      const aiData = this.parseAIResponse(aiContent);
      
      // Merge with original data
      return this.mergeWithOriginalData(parsedData, aiData);
    } catch (error) {
      console.error('Error enhancing OCR data with AI:', error);
      // Return original data with basic enhancements if AI fails
      return this.getFallbackEnhancement(parsedData);
    }
  }

  private buildPrompt(parsedData: ParsedOCRData): string {
    return `
Analyze this body composition data and provide comprehensive insights:

**Body Composition:**
- BMI: ${parsedData.composition.bmi || 'N/A'}
- BMR: ${parsedData.composition.bmr || 'N/A'} kcal
- VFA: ${parsedData.composition.vfa || 'N/A'}
- Body Fat: ${parsedData.composition.bodyFat || 'N/A'}%
- Muscle Mass: ${parsedData.composition.muscleMass || 'N/A'} kg
- Water: ${parsedData.composition.waterPercentage || 'N/A'}%

**Body Segments (kg):**
- Right Arm: ${parsedData.segment.rightArm || 'N/A'}
- Left Arm: ${parsedData.segment.leftArm || 'N/A'}
- Trunk: ${parsedData.segment.trunk || 'N/A'}
- Right Leg: ${parsedData.segment.rightLeg || 'N/A'}
- Left Leg: ${parsedData.segment.leftLeg || 'N/A'}

**Obesity Analysis:**
- Visceral Fat: ${parsedData.obesity.visceralFat || 'N/A'}
- Subcutaneous Fat: ${parsedData.obesity.subcutaneousFat || 'N/A'}
- Total Body Fat: ${parsedData.obesity.totalBodyFat || 'N/A'}%

**Current Suggestions:**
${parsedData.suggestion.recommendations?.join('\n') || 'None provided'}

Please provide:
1. Enhanced composition insights with additional metrics
2. Muscle balance analysis
3. Obesity level classification and health risk assessment
4. Specific, actionable recommendations for diet and exercise
5. Target goals and timeline estimates
6. Priority areas for improvement

Return the response in JSON format matching the schema provided.
`;
  }

  private parseAIResponse(content: string): Partial<AIEnhancedData> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return AIResponseSchema.parse(parsed);
      }
      
      // If no JSON found, return empty object
      return {};
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {};
    }
  }

  private mergeWithOriginalData(
    original: ParsedOCRData,
    aiEnhanced: Partial<AIEnhancedData>
  ): AIEnhancedData {
    return {
      composition: {
        ...original.composition,
        ...aiEnhanced.composition,
      },
      segment: {
        ...original.segment,
        ...aiEnhanced.segment,
      },
      obesity: {
        ...original.obesity,
        ...aiEnhanced.obesity,
      },
      suggestion: {
        ...original.suggestion,
        ...aiEnhanced.suggestion,
      },
    };
  }

  private getFallbackEnhancement(parsedData: ParsedOCRData): AIEnhancedData {
    // Basic fallback enhancements when AI service is unavailable
    const bmi = parsedData.composition.bmi;
    let obesityLevel: "underweight" | "normal" | "overweight" | "obese" = "normal";
    let healthRisk: "low" | "moderate" | "high" | "very_high" = "low";

    if (bmi) {
      if (bmi < 18.5) {
        obesityLevel = "underweight";
        healthRisk = "low";
      } else if (bmi < 25) {
        obesityLevel = "normal";
        healthRisk = "low";
      } else if (bmi < 30) {
        obesityLevel = "overweight";
        healthRisk = "moderate";
      } else {
        obesityLevel = "obese";
        healthRisk = "high";
      }
    }

    const recommendations = [];
    if (parsedData.composition.bodyFat && parsedData.composition.bodyFat > 25) {
      recommendations.push("Reduce body fat through calorie deficit and increased activity");
    }
    if (parsedData.composition.muscleMass && parsedData.composition.muscleMass < 30) {
      recommendations.push("Focus on resistance training to build muscle mass");
    }

    return {
      composition: {
        ...parsedData.composition,
        metabolicAge: undefined,
        physiqueRating: undefined,
      },
      segment: {
        ...parsedData.segment,
        muscleBalance: {
          leftRight: parsedData.segment.leftArm && parsedData.segment.rightArm 
            ? Math.abs(parsedData.segment.leftArm - parsedData.segment.rightArm) 
            : undefined,
          upperLower: parsedData.segment.trunk && (parsedData.segment.leftLeg || parsedData.segment.rightLeg)
            ? Math.abs(parsedData.segment.trunk - ((parsedData.segment.leftLeg || 0) + (parsedData.segment.rightLeg || 0)) / 2)
            : undefined,
        },
      },
      obesity: {
        ...parsedData.obesity,
        obesityLevel,
        healthRisk,
      },
      suggestion: {
        ...parsedData.suggestion,
        recommendations: [...(parsedData.suggestion.recommendations || []), ...recommendations],
        exerciseRecommendations: [
          "30 minutes of moderate cardio 5 days per week",
          "Full body resistance training 3 days per week",
          "Daily stretching and mobility work",
        ],
        dietaryAdvice: [
          "Maintain a 500-calorie daily deficit for weight loss",
          "Increase protein intake to 1.6g per kg body weight",
          "Focus on whole foods and limit processed foods",
        ],
        weeklyCalorieDeficit: 3500,
        estimatedTimeToGoal: "12-16 weeks",
        priorityAreas: ["body fat reduction", "muscle mass increase"],
      },
    };
  }
}

// Factory function to create AI service instance
export function createAIService(): AIService {
  const config = {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.AI_MODEL || "gpt-4-turbo-preview",
  };

  if (!config.apiKey) {
    console.warn("AI API key not configured. AI enhancements will use fallback data.");
  }

  return new AIService(config);
}