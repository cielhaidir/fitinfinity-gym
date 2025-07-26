import { z } from "zod";
import { type ParsedOCRData } from "./ocrParser";

// AI Model Response Schemas
const AICompositionSchema = z.object({
  bmi: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  bmr: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  vfa: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  bodyFat: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  muscleMass: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  boneMass: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  waterPercentage: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  proteinPercentage: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  metabolicAge: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  physiqueRating: z.number().nullable().optional().transform(val => val === null ? undefined : val),
});

const AISegmentSchema = z.object({
  rightArm: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  leftArm: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  trunk: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  rightLeg: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  leftLeg: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  muscleBalance: z.object({
    leftRight: z.union([z.number(), z.string()]).nullable().optional().transform(val => val === null ? undefined : val),
    upperLower: z.union([z.number(), z.string()]).nullable().optional().transform(val => val === null ? undefined : val),
  }).optional(),
});

const AIObesitySchema = z.object({
  visceralFat: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  subcutaneousFat: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  totalBodyFat: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  fatMassIndex: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  obesityLevel: z.enum(["underweight", "normal", "overweight", "obese"]).nullable().optional().transform(val => val === null ? undefined : val),
  healthRisk: z.enum(["low", "moderate", "high", "very_high"]).nullable().optional().transform(val => val === null ? undefined : val),
});

const AISuggestionSchema = z.object({
  recommendations: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
  targetWeight: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  targetBMI: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  exerciseRecommendations: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
  gymWorkoutPlan: z.object({
    cardio: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    strengthTraining: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    weeklySchedule: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    intensity: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  }).optional(),
  dietaryAdvice: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
  nutritionPlan: z.object({
    macronutrients: z.object({
      protein: z.object({
        grams: z.number().nullable().optional().transform(val => val === null ? undefined : val),
        percentage: z.number().nullable().optional().transform(val => val === null ? undefined : val),
        sources: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
      }).optional(),
      carbohydrates: z.object({
        grams: z.number().nullable().optional().transform(val => val === null ? undefined : val),
        percentage: z.number().nullable().optional().transform(val => val === null ? undefined : val),
        sources: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
      }).optional(),
      fats: z.object({
        grams: z.number().nullable().optional().transform(val => val === null ? undefined : val),
        percentage: z.number().nullable().optional().transform(val => val === null ? undefined : val),
        sources: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
      }).optional(),
    }).optional(),
    micronutrients: z.array(z.object({
      name: z.string(),
      dailyAmount: z.string(),
      sources: z.array(z.string()),
      importance: z.string(),
    })).nullable().optional().transform(val => val === null ? undefined : val),
    mealTiming: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    hydration: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  }).optional(),
  lifestyleHabits: z.object({
    sleep: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    stressManagement: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    dailyHabits: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
    supplementation: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
  }).optional(),
  weeklyCalorieDeficit: z.number().nullable().optional().transform(val => val === null ? undefined : val),
  estimatedTimeToGoal: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  priorityAreas: z.array(z.string()).nullable().optional().transform(val => val === null ? undefined : val),
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

  async processImage(imageBase64: string): Promise<AIEnhancedData> {
    try {
      const prompt = this.buildImageAnalysisPrompt();
      
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
              content: `You are a professional fitness and health AI assistant specialized in analyzing body composition scale printouts. Analyze the provided image and extract all body composition data, then generate comprehensive insights, recommendations, and health assessments. Be specific, actionable, and evidence-based in your recommendations. Provide all recommendations, advice, and text content in Indonesian language (Bahasa Indonesia), but keep the JSON structure and field names in English.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
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
      
      // Return the AI-analyzed data
      return this.validateAndStructureData(aiData);
    } catch (error) {
      console.error('Error processing image with AI:', error);
      // Return fallback data if AI fails
      return this.getEmptyFallbackData();
    }
  }

  async processMultipleImages(imagesBase64: string[]): Promise<AIEnhancedData> {
    try {
      const prompt = this.buildMultipleImagesAnalysisPrompt();
      
      // Convert all images to the message format
      const imageMessages = imagesBase64.map(imageBase64 => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`
        }
      }));

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
              content: `You are a professional fitness and health AI assistant specialized in analyzing body composition scale printouts. Analyze the provided images and extract all body composition data from all images, then generate comprehensive insights, recommendations, and health assessments. Be specific, actionable, and evidence-based in your recommendations. Combine data from multiple images when they show different aspects of the same analysis. Provide all recommendations, advice, and text content in Indonesian language (Bahasa Indonesia), but keep the JSON structure and field names in English.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                ...imageMessages
              ]
            }
          ],
          temperature: 0.7,
          max_tokens: 3000,
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

      console.log('AI Response:', aiContent);
      // Parse the AI response
      const aiData = this.parseAIResponse(aiContent);
      
      // Return the AI-analyzed data
      return this.validateAndStructureData(aiData);
    } catch (error) {
      console.error('Error processing multiple images with AI:', error);
      // Return fallback data if AI fails
      return this.getEmptyFallbackData();
    }
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

  private buildImageAnalysisPrompt(): string {
    return `
Analyze this body composition scale printout image and extract all the data you can see, then provide comprehensive personalized recommendations IN INDONESIAN LANGUAGE (Bahasa Indonesia).

**STEP 1: Extract Data from Image**
Look for and extract:
- BMI, BMR, VFA, Body Fat %, Muscle Mass, Bone Mass, Water %, Protein %, Metabolic Age, Physique Rating
- Body segments (Right/Left Arm, Trunk, Right/Left Leg muscle mass in kg)
- Obesity metrics (Visceral Fat, Subcutaneous Fat, Total Body Fat, Fat Mass Index)
- Any existing recommendations shown on the printout

**STEP 2: Provide Personalized Recommendations (IN INDONESIAN)**
Based on the extracted data, provide detailed personalized advice for:

**1. NUTRITION PLAN (Macros & Micros):**
- Calculate daily protein needs (grams and %) with specific food sources (Indonesian foods)
- Calculate carbohydrate needs (grams and %) with timing and sources (Indonesian foods)
- Calculate healthy fat requirements (grams and %) with sources (Indonesian foods)
- Essential micronutrients needed based on body composition (vitamins, minerals)
- Meal timing strategy for optimal results
- Daily hydration requirements

**2. GYM EXERCISE RECOMMENDATIONS:**
- Specific cardio exercises with duration and intensity
- Strength training exercises targeting weak areas identified in body composition with Gym Equipment
- Weekly workout schedule (days, muscle groups, rest days)
- Progressive overload recommendations
- Exercise intensity levels based on current fitness

**3. LIFESTYLE HABITS:**
- Sleep optimization (duration, quality, timing)
- Stress management techniques
- Daily habits for long-term success
- Supplement recommendations if needed

**4. GOALS & TIMELINE:**
- Realistic target weight and body composition changes
- Weekly calorie deficit/surplus recommendations
- Estimated timeline to reach goals
- Priority areas for improvement

Return comprehensive response in this JSON format (ALL TEXT CONTENT MUST BE IN INDONESIAN LANGUAGE):
{
  "composition": { "bmi": number, "bmr": number, "vfa": number, "bodyFat": number, "muscleMass": number, "boneMass": number, "waterPercentage": number, "proteinPercentage": number, "metabolicAge": number, "physiqueRating": number },
  "segment": { "rightArm": number, "leftArm": number, "trunk": number, "rightLeg": number, "leftLeg": number, "muscleBalance": { "leftRight": number, "upperLower": number } },
  "obesity": { "visceralFat": number, "subcutaneousFat": number, "totalBodyFat": number, "fatMassIndex": number, "obesityLevel": "underweight|normal|overweight|obese", "healthRisk": "low|moderate|high|very_high" },
  "suggestion": {
    "recommendations": ["overall health recommendations"],
    "targetWeight": number,
    "targetBMI": number,
    "exerciseRecommendations": ["general exercise advice"],
    "gymWorkoutPlan": {
      "cardio": ["specific cardio exercises with duration"],
      "strengthTraining": ["specific gym exercises targeting weak areas"],
      "weeklySchedule": ["Monday: Upper body, Tuesday: Cardio, etc."],
      "intensity": "beginner/intermediate/advanced"
    },
    "dietaryAdvice": ["general dietary recommendations"],
    "nutritionPlan": {
      "macronutrients": {
        "protein": { "grams": number, "percentage": number, "sources": ["chicken, fish, eggs, etc."] },
        "carbohydrates": { "grams": number, "percentage": number, "sources": ["oats, rice, fruits, etc."] },
        "fats": { "grams": number, "percentage": number, "sources": ["avocado, nuts, olive oil, etc."] }
      },
      "micronutrients": [
        { "name": "Vitamin D", "dailyAmount": "1000 IU", "sources": ["sunlight, fish, supplements"], "importance": "bone health and muscle function" }
      ],
      "mealTiming": ["eat protein within 2 hours post-workout", "consume carbs around workouts"],
      "hydration": "3-4 liters daily, more on workout days"
    },
    "lifestyleHabits": {
      "sleep": ["7-9 hours nightly", "consistent sleep schedule", "avoid screens 1 hour before bed"],
      "stressManagement": ["meditation 10 min daily", "deep breathing exercises", "regular nature walks"],
      "dailyHabits": ["morning sunlight exposure", "track progress weekly", "meal prep on Sundays"],
      "supplementation": ["whey protein if needed", "multivitamin", "omega-3 if low fish intake"]
    },
    "weeklyCalorieDeficit": number,
    "estimatedTimeToGoal": "12-16 weeks for sustainable results",
    "priorityAreas": ["areas needing most attention based on data"]
  }
}

Make recommendations specific, actionable, and personalized based on the actual body composition data extracted from the image.

IMPORTANT:
1. Provide ALL text content (recommendations, advice, descriptions) in Indonesian language (Bahasa Indonesia)
2. Return ONLY the JSON object, no additional text or explanations
3. Ensure the JSON is valid and parseable - use double quotes for all strings
4. Do NOT include trailing commas anywhere in the JSON
5. Do NOT include comments or explanations outside the JSON
6. Make sure all array elements are properly formatted with commas between them (but no trailing comma after the last element)
`;
  }

  private buildMultipleImagesAnalysisPrompt(): string {
    return `
Analyze these multiple body composition scale printout images and extract all the data you can see from ALL images combined. The images may show different aspects of the same analysis or different pages of the results.

**STEP 1: Extract Data from ALL Images**
Look across all images and extract:
- BMI, BMR, VFA, Body Fat %, Muscle Mass, Bone Mass, Water %, Protein %, Metabolic Age, Physique Rating
- Body segments (Right/Left Arm, Trunk, Right/Left Leg muscle mass in kg)
- Obesity metrics (Visceral Fat, Subcutaneous Fat, Total Body Fat, Fat Mass Index)
- Any existing recommendations shown on any of the printouts
- Additional metrics that might be spread across different images

**STEP 2: Combine and Provide Comprehensive Personalized Recommendations**
Based on ALL extracted data from multiple images, provide detailed personalized advice for:

**1. NUTRITION PLAN (Macros & Micros):**
- Calculate daily protein needs (grams and %) with specific food sources
- Calculate carbohydrate needs (grams and %) with timing and sources
- Calculate healthy fat requirements (grams and %) with sources
- Essential micronutrients needed based on body composition (vitamins, minerals)
- Meal timing strategy for optimal results
- Daily hydration requirements

**2. GYM EXERCISE RECOMMENDATIONS:**
- Specific cardio exercises with duration and intensity
- Strength training exercises targeting weak areas identified in body composition
- Weekly workout schedule (days, muscle groups, rest days)
- Progressive overload recommendations
- Exercise intensity levels based on current fitness

**3. LIFESTYLE HABITS:**
- Sleep optimization (duration, quality, timing)
- Stress management techniques
- Daily habits for long-term success
- Supplement recommendations if needed

**4. GOALS & TIMELINE:**
- Realistic target weight and body composition changes
- Weekly calorie deficit/surplus recommendations
- Estimated timeline to reach goals
- Priority areas for improvement

Return comprehensive response in this JSON format (ALL TEXT CONTENT MUST BE IN INDONESIAN LANGUAGE):
{
  "composition": { "bmi": number, "bmr": number, "vfa": number, "bodyFat": number, "muscleMass": number, "boneMass": number, "waterPercentage": number, "proteinPercentage": number, "metabolicAge": number, "physiqueRating": number },
  "segment": { "rightArm": number, "leftArm": number, "trunk": number, "rightLeg": number, "leftLeg": number, "muscleBalance": { "leftRight": number, "upperLower": number } },
  "obesity": { "visceralFat": number, "subcutaneousFat": number, "totalBodyFat": number, "fatMassIndex": number, "obesityLevel": "underweight|normal|overweight|obese", "healthRisk": "low|moderate|high|very_high" },
  "suggestion": {
    "recommendations": ["overall health recommendations"],
    "targetWeight": number,
    "targetBMI": number,
    "exerciseRecommendations": ["general exercise advice"],
    "gymWorkoutPlan": {
      "cardio": ["specific cardio exercises with duration"],
      "strengthTraining": ["specific gym exercises targeting weak areas"],
      "weeklySchedule": ["Monday: Upper body, Tuesday: Cardio, etc."],
      "intensity": "beginner/intermediate/advanced"
    },
    "dietaryAdvice": ["general dietary recommendations"],
    "nutritionPlan": {
      "macronutrients": {
        "protein": { "grams": number, "percentage": number, "sources": ["chicken, fish, eggs, etc."] },
        "carbohydrates": { "grams": number, "percentage": number, "sources": ["oats, rice, fruits, etc."] },
        "fats": { "grams": number, "percentage": number, "sources": ["avocado, nuts, olive oil, etc."] }
      },
      "micronutrients": [
        { "name": "Vitamin D", "dailyAmount": "1000 IU", "sources": ["sunlight, fish, supplements"], "importance": "bone health and muscle function" }
      ],
      "mealTiming": ["eat protein within 2 hours post-workout", "consume carbs around workouts"],
      "hydration": "3-4 liters daily, more on workout days"
    },
    "lifestyleHabits": {
      "sleep": ["7-9 hours nightly", "consistent sleep schedule", "avoid screens 1 hour before bed"],
      "stressManagement": ["meditation 10 min daily", "deep breathing exercises", "regular nature walks"],
      "dailyHabits": ["morning sunlight exposure", "track progress weekly", "meal prep on Sundays"],
      "supplementation": ["whey protein if needed", "multivitamin", "omega-3 if low fish intake"]
    },
    "weeklyCalorieDeficit": number,
    "estimatedTimeToGoal": "12-16 weeks for sustainable results",
    "priorityAreas": ["areas needing most attention based on data"]
  }
}

Make recommendations specific, actionable, and personalized based on the actual body composition data extracted from ALL the images provided.

IMPORTANT:
1. Provide ALL text content (recommendations, advice, descriptions) in Indonesian language (Bahasa Indonesia)
2. Return ONLY the JSON object, no additional text or explanations
3. Ensure the JSON is valid and parseable - use double quotes for all strings
4. Do NOT include trailing commas anywhere in the JSON
5. Do NOT include comments or explanations outside the JSON
6. Make sure all array elements are properly formatted with commas between them (but no trailing comma after the last element)
`;
  }

  private validateAndStructureData(aiData: Partial<AIEnhancedData>): AIEnhancedData {
    // Ensure all required structure exists with fallbacks
    return {
      composition: {
        bmi: aiData.composition?.bmi ?? undefined,
        bmr: aiData.composition?.bmr ?? undefined,
        vfa: aiData.composition?.vfa ?? undefined,
        bodyFat: aiData.composition?.bodyFat ?? undefined,
        muscleMass: aiData.composition?.muscleMass ?? undefined,
        boneMass: aiData.composition?.boneMass ?? undefined,
        waterPercentage: aiData.composition?.waterPercentage ?? undefined,
        proteinPercentage: aiData.composition?.proteinPercentage ?? undefined,
        metabolicAge: aiData.composition?.metabolicAge ?? undefined,
        physiqueRating: aiData.composition?.physiqueRating ?? undefined,
      },
      segment: {
        rightArm: aiData.segment?.rightArm ?? undefined,
        leftArm: aiData.segment?.leftArm ?? undefined,
        trunk: aiData.segment?.trunk ?? undefined,
        rightLeg: aiData.segment?.rightLeg ?? undefined,
        leftLeg: aiData.segment?.leftLeg ?? undefined,
        muscleBalance: {
          leftRight: aiData.segment?.muscleBalance?.leftRight ?? undefined,
          upperLower: aiData.segment?.muscleBalance?.upperLower ?? undefined,
        },
      },
      obesity: {
        visceralFat: aiData.obesity?.visceralFat ?? undefined,
        subcutaneousFat: aiData.obesity?.subcutaneousFat ?? undefined,
        totalBodyFat: aiData.obesity?.totalBodyFat ?? undefined,
        fatMassIndex: aiData.obesity?.fatMassIndex ?? undefined,
        obesityLevel: aiData.obesity?.obesityLevel ?? undefined,
        healthRisk: aiData.obesity?.healthRisk ?? undefined,
      },
      suggestion: {
        recommendations: aiData.suggestion?.recommendations ?? [],
        targetWeight: aiData.suggestion?.targetWeight ?? undefined,
        targetBMI: aiData.suggestion?.targetBMI ?? undefined,
        exerciseRecommendations: aiData.suggestion?.exerciseRecommendations ?? [
          "Consult with a fitness professional for personalized exercise recommendations",
          "Start with light cardio and gradually increase intensity",
        ],
        gymWorkoutPlan: {
          cardio: aiData.suggestion?.gymWorkoutPlan?.cardio ?? [
            "Treadmill walking 20-30 minutes at moderate pace",
            "Stationary bike 15-25 minutes",
            "Elliptical 20-30 minutes low-moderate intensity",
          ],
          strengthTraining: aiData.suggestion?.gymWorkoutPlan?.strengthTraining ?? [
            "Bodyweight squats 3 sets of 10-15 reps",
            "Push-ups (modified if needed) 3 sets of 5-10 reps",
            "Plank hold 30-60 seconds",
            "Dumbbell rows 3 sets of 10-12 reps",
          ],
          weeklySchedule: aiData.suggestion?.gymWorkoutPlan?.weeklySchedule ?? [
            "Monday: Upper body strength training",
            "Tuesday: 30 min cardio",
            "Wednesday: Lower body strength training",
            "Thursday: Rest or light activity",
            "Friday: Full body strength training",
            "Saturday: 30 min cardio or outdoor activity",
            "Sunday: Rest and recovery",
          ],
          intensity: aiData.suggestion?.gymWorkoutPlan?.intensity ?? "beginner",
        },
        dietaryAdvice: aiData.suggestion?.dietaryAdvice ?? [
          "Focus on whole, unprocessed foods",
          "Eat regular meals to maintain stable energy",
          "Include lean protein with each meal",
        ],
        nutritionPlan: {
          macronutrients: {
            protein: {
              grams: aiData.suggestion?.nutritionPlan?.macronutrients?.protein?.grams ?? 120,
              percentage: aiData.suggestion?.nutritionPlan?.macronutrients?.protein?.percentage ?? 25,
              sources: aiData.suggestion?.nutritionPlan?.macronutrients?.protein?.sources ?? [
                "Chicken breast", "Fish (salmon, tuna)", "Eggs", "Greek yogurt", "Lean beef", "Tofu", "Lentils"
              ],
            },
            carbohydrates: {
              grams: aiData.suggestion?.nutritionPlan?.macronutrients?.carbohydrates?.grams ?? 180,
              percentage: aiData.suggestion?.nutritionPlan?.macronutrients?.carbohydrates?.percentage ?? 45,
              sources: aiData.suggestion?.nutritionPlan?.macronutrients?.carbohydrates?.sources ?? [
                "Oats", "Brown rice", "Quinoa", "Sweet potatoes", "Fruits", "Vegetables", "Whole grain bread"
              ],
            },
            fats: {
              grams: aiData.suggestion?.nutritionPlan?.macronutrients?.fats?.grams ?? 60,
              percentage: aiData.suggestion?.nutritionPlan?.macronutrients?.fats?.percentage ?? 30,
              sources: aiData.suggestion?.nutritionPlan?.macronutrients?.fats?.sources ?? [
                "Avocados", "Nuts (almonds, walnuts)", "Olive oil", "Fatty fish", "Seeds (chia, flax)", "Nut butters"
              ],
            },
          },
          micronutrients: aiData.suggestion?.nutritionPlan?.micronutrients ?? [
            {
              name: "Vitamin D",
              dailyAmount: "1000-2000 IU",
              sources: ["Sunlight exposure", "Fatty fish", "Fortified foods", "Supplements"],
              importance: "Essential for bone health, muscle function, and immune system"
            },
            {
              name: "Magnesium",
              dailyAmount: "300-400 mg",
              sources: ["Dark leafy greens", "Nuts", "Seeds", "Whole grains"],
              importance: "Supports muscle and nerve function, energy production"
            },
            {
              name: "Omega-3 fatty acids",
              dailyAmount: "1-2 grams EPA/DHA",
              sources: ["Fatty fish", "Fish oil supplements", "Flaxseeds", "Walnuts"],
              importance: "Reduces inflammation, supports heart and brain health"
            },
          ],
          mealTiming: aiData.suggestion?.nutritionPlan?.mealTiming ?? [
            "Eat protein within 2 hours after strength training",
            "Have carbohydrates around workout times for energy",
            "Eat every 3-4 hours to maintain steady blood sugar",
            "Have your largest meals earlier in the day",
          ],
          hydration: aiData.suggestion?.nutritionPlan?.hydration ?? "3-4 liters daily, increase to 4-5 liters on workout days",
        },
        lifestyleHabits: {
          sleep: aiData.suggestion?.lifestyleHabits?.sleep ?? [
            "Aim for 7-9 hours of quality sleep nightly",
            "Maintain consistent sleep and wake times",
            "Avoid screens 1 hour before bedtime",
            "Keep bedroom cool, dark, and quiet",
          ],
          stressManagement: aiData.suggestion?.lifestyleHabits?.stressManagement ?? [
            "Practice meditation or deep breathing 10 minutes daily",
            "Take regular walks in nature",
            "Engage in hobbies you enjoy",
            "Consider yoga or tai chi for stress relief",
          ],
          dailyHabits: aiData.suggestion?.lifestyleHabits?.dailyHabits ?? [
            "Get morning sunlight exposure within 1 hour of waking",
            "Take progress photos and measurements weekly",
            "Meal prep on weekends for the week ahead",
            "Stay active throughout the day with regular movement breaks",
          ],
          supplementation: aiData.suggestion?.lifestyleHabits?.supplementation ?? [
            "Consider whey protein if struggling to meet protein goals",
            "High-quality multivitamin to cover nutritional gaps",
            "Omega-3 supplement if fish intake is low",
            "Vitamin D3 if limited sun exposure",
          ],
        },
        weeklyCalorieDeficit: aiData.suggestion?.weeklyCalorieDeficit ?? undefined,
        estimatedTimeToGoal: aiData.suggestion?.estimatedTimeToGoal ?? "12-16 weeks for sustainable results",
        priorityAreas: aiData.suggestion?.priorityAreas ?? ["body composition improvement", "consistent exercise routine"],
      },
    };
  }

  private getEmptyFallbackData(): AIEnhancedData {
    return {
      composition: {
        bmi: undefined,
        bmr: undefined,
        vfa: undefined,
        bodyFat: undefined,
        muscleMass: undefined,
        boneMass: undefined,
        waterPercentage: undefined,
        proteinPercentage: undefined,
        metabolicAge: undefined,
        physiqueRating: undefined,
      },
      segment: {
        rightArm: undefined,
        leftArm: undefined,
        trunk: undefined,
        rightLeg: undefined,
        leftLeg: undefined,
        muscleBalance: {
          leftRight: undefined,
          upperLower: undefined,
        },
      },
      obesity: {
        visceralFat: undefined,
        subcutaneousFat: undefined,
        totalBodyFat: undefined,
        fatMassIndex: undefined,
        obesityLevel: undefined,
        healthRisk: undefined,
      },
      suggestion: {
        recommendations: ["Tidak dapat menganalisis gambar. Silakan coba unggah gambar printout skala komposisi tubuh yang lebih jelas."],
        targetWeight: undefined,
        targetBMI: undefined,
        exerciseRecommendations: [
          "Konsultasi dengan profesional kebugaran untuk rekomendasi yang dipersonalisasi",
          "Mulai dengan olahraga ringan dan tingkatkan intensitas secara bertahap",
        ],
        gymWorkoutPlan: {
          cardio: [
            "Mulai dengan jalan kaki ringan 15-20 menit",
            "Tingkatkan durasi secara bertahap seiring peningkatan kebugaran",
          ],
          strengthTraining: [
            "Mulai dengan latihan berat badan",
            "Fokus pada bentuk yang benar daripada intensitas",
          ],
          weeklySchedule: [
            "Mulai dengan 3 hari per minggu aktivitas ringan",
            "Berikan hari istirahat di antara latihan",
          ],
          intensity: "beginner",
        },
        dietaryAdvice: [
          "Fokus pada makanan utuh dan tidak diproses",
          "Konsultasi dengan ahli gizi untuk saran yang dipersonalisasi",
        ],
        nutritionPlan: {
          macronutrients: {
            protein: {
              grams: undefined,
              percentage: undefined,
              sources: ["Daging tanpa lemak", "Ikan", "Telur", "Kacang-kacangan", "Produk susu"],
            },
            carbohydrates: {
              grams: undefined,
              percentage: undefined,
              sources: ["Biji-bijian utuh", "Buah-buahan", "Sayuran", "Oat"],
            },
            fats: {
              grams: undefined,
              percentage: undefined,
              sources: ["Kacang-kacangan", "Alpukat", "Minyak zaitun", "Ikan"],
            },
          },
          micronutrients: [
            {
              name: "Multivitamin umum",
              dailyAmount: "Sesuai petunjuk",
              sources: ["Diet seimbang", "Suplemen jika diperlukan"],
              importance: "Dukungan kesehatan umum ketika analisis diet tidak tersedia"
            }
          ],
          mealTiming: [
            "Makan teratur sepanjang hari",
            "Jangan lewatkan sarapan",
          ],
          hydration: "8-10 gelas air setiap hari",
        },
        lifestyleHabits: {
          sleep: [
            "Targetkan 7-9 jam tidur setiap malam",
            "Pertahankan jadwal tidur yang konsisten",
          ],
          stressManagement: [
            "Praktikkan teknik relaksasi",
            "Lakukan aktivitas yang Anda nikmati",
          ],
          dailyHabits: [
            "Tetap aktif sepanjang hari",
            "Pantau kemajuan Anda secara teratur",
          ],
          supplementation: [
            "Konsultasi dengan penyedia layanan kesehatan sebelum memulai suplemen",
          ],
        },
        weeklyCalorieDeficit: undefined,
        estimatedTimeToGoal: undefined,
        priorityAreas: ["kualitas_gambar", "ekstraksi_data", "konsultasi_profesional"],
      },
    };
  }

  private parseAIResponse(content: string): Partial<AIEnhancedData> {
    try {
      console.log('Parsing AI response:', content);
      
      // First, try to find the main JSON object with proper opening and closing braces
      let jsonStart = content.indexOf('{');
      let jsonEnd = -1;
      
      if (jsonStart !== -1) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = jsonStart; i < content.length; i++) {
          const char = content[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
        }
        
        if (jsonEnd !== -1) {
          let jsonStr = content.substring(jsonStart, jsonEnd + 1);
          
          // Clean up common JSON issues more aggressively
          jsonStr = jsonStr
            .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
            .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
            .replace(/}\s*,\s*]/g, '}]') // Fix object ending with comma in array
            .replace(/"\s*,\s*,/g, '",') // Remove double commas
            .replace(/,\s*,/g, ',') // Remove double commas
            .replace(/:\s*,/g, ': null,') // Fix empty values
            .replace(/:\s*}/g, ': null}') // Fix empty values at end of object
            .replace(/"\s*\n\s*"/g, '", "') // Fix newlines in strings
            .replace(/\n\s*/g, ' ') // Remove excessive whitespace
            .trim();
          
          console.log('Cleaned JSON string:', jsonStr);
          
          try {
            const parsed = JSON.parse(jsonStr);
            console.log('Successfully parsed JSON:', parsed);
            return AIResponseSchema.parse(parsed);
          } catch (parseError) {
            console.warn('Failed to parse cleaned JSON:', parseError);
            
            // Try a more aggressive cleanup approach
            try {
              // Attempt to fix common issues with nested structures
              jsonStr = jsonStr
                .replace(/"\s*:\s*\[([^\]]*?)\s*,\s*\]/g, '": [$1]') // Fix trailing commas in arrays
                .replace(/"\s*:\s*\{([^}]*?)\s*,\s*\}/g, '": {$1}') // Fix trailing commas in objects
                .replace(/,(\s*[}\]])/g, '$1'); // Remove any remaining trailing commas
              
              console.log('Second cleanup attempt:', jsonStr);
              const parsed2 = JSON.parse(jsonStr);
              return AIResponseSchema.parse(parsed2);
            } catch (secondError) {
              console.warn('Second cleanup attempt failed:', secondError);
            }
          }
        }
      }
      
      // Fallback: try to extract individual JSON blocks
      const jsonMatches = content.match(/\{[\s\S]*?\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try each JSON block, starting from the largest one (most likely to be complete)
        const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
        
        for (let i = 0; i < sortedMatches.length; i++) {
          try {
            let jsonStr = sortedMatches[i]!;
            
            // Basic cleanup
            jsonStr = jsonStr
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              .replace(/,\s*,/g, ',')
              .trim();
            
            const parsed = JSON.parse(jsonStr);
            const validated = AIResponseSchema.parse(parsed);
            console.log('Successfully parsed fallback JSON block:', validated);
            return validated;
          } catch (parseError) {
            console.warn(`Failed to parse JSON block ${i}:`, parseError);
            continue;
          }
        }
      }
      
      console.warn('No valid JSON found in AI response');
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
    model: process.env.AI_MODEL || "gpt-4o", // Use gpt-4o for vision capabilities
  };

  if (!config.apiKey) {
    console.warn("AI API key not configured. AI enhancements will use fallback data.");
  }

  return new AIService(config);
}