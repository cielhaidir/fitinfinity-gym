"use client";

import { useRef, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Upload, X, Loader2, Save, Eye, EyeOff, Zap, Dumbbell, Apple, Heart } from "lucide-react";
import Image from "next/image";

interface AIEnhancedData {
  composition: {
    bmi?: number;
    bmr?: number;
    vfa?: number;
    bodyFat?: number;
    muscleMass?: number;
    boneMass?: number;
    waterPercentage?: number;
    proteinPercentage?: number;
    metabolicAge?: number;
    physiqueRating?: number;
  };
  segment: {
    rightArm?: number;
    leftArm?: number;
    trunk?: number;
    rightLeg?: number;
    leftLeg?: number;
    muscleBalance?: {
      leftRight?: number;
      upperLower?: number;
    };
  };
  obesity: {
    visceralFat?: number;
    subcutaneousFat?: number;
    totalBodyFat?: number;
    fatMassIndex?: number;
    obesityLevel?: "underweight" | "normal" | "overweight" | "obese";
    healthRisk?: "low" | "moderate" | "high" | "very_high";
  };
  suggestion: {
    recommendations?: string[];
    targetWeight?: number;
    targetBMI?: number;
    exerciseRecommendations?: string[];
    gymWorkoutPlan?: {
      cardio?: string[];
      strengthTraining?: string[];
      weeklySchedule?: string[];
      intensity?: string;
    };
    dietaryAdvice?: string[];
    nutritionPlan?: {
      macronutrients?: {
        protein?: {
          grams?: number;
          percentage?: number;
          sources?: string[];
        };
        carbohydrates?: {
          grams?: number;
          percentage?: number;
          sources?: string[];
        };
        fats?: {
          grams?: number;
          percentage?: number;
          sources?: string[];
        };
      };
      micronutrients?: Array<{
        name: string;
        dailyAmount: string;
        sources: string[];
        importance: string;
      }>;
      mealTiming?: string[];
      hydration?: string;
    };
    lifestyleHabits?: {
      sleep?: string[];
      stressManagement?: string[];
      dailyHabits?: string[];
      supplementation?: string[];
    };
    weeklyCalorieDeficit?: number;
    estimatedTimeToGoal?: string;
    priorityAreas?: string[];
  };
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
}

export const AIBodyCompositionForm: React.FC = (): ReactNode => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);
  const [aiData, setAiData] = useState<AIEnhancedData | null>(null);

  const processImageMutation = api.tracking.processImage.useMutation();
  const processMultipleImagesMutation = api.tracking.processMultipleImages.useMutation();
  const saveTrackingMutation = api.tracking.saveTracking.useMutation();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newImages: UploadedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large. Max 10MB`);
          continue;
        }

        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (data:image/jpeg;base64,)
            const base64 = result.split(',')[1];
            resolve(base64 || '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;
        const preview = URL.createObjectURL(file);

        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          preview,
          base64,
        });
      }

      setUploadedImages((prev) => [...prev, ...newImages]);
      toast.success(`${newImages.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      // Revoke object URL to prevent memory leaks
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

  const removeAllImages = () => {
    uploadedImages.forEach((img) => {
      URL.revokeObjectURL(img.preview);
    });
    setUploadedImages([]);
    setAiData(null);
  };

  const processImages = async () => {
    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one image first");
      return;
    }

    setIsProcessing(true);

    try {
      let result;
      
      if (uploadedImages.length === 1) {
        // Use single image processing for one image
        result = await processImageMutation.mutateAsync({ 
          image: uploadedImages[0]!.base64
        });
      } else {
        // Use multiple images processing for more than one image
        const base64Images = uploadedImages.map((img) => img.base64);
        result = await processMultipleImagesMutation.mutateAsync({ 
          images: base64Images
        });
      }

      if (result.success && result.data) {
        setAiData(result.data);
        toast.success(`${uploadedImages.length} image(s) analyzed successfully with AI!`);
      } else {
        toast.error(result.error || "Failed to analyze images");
      }
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Failed to analyze images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTracking = async () => {
    if (!aiData) {
      toast.error("No data to save");
      return;
    }

    try {
      await saveTrackingMutation.mutateAsync({
        composition: aiData.composition,
        segment: aiData.segment,
        obesity: aiData.obesity,
        suggestion: aiData.suggestion,
      });
      
      await utils.tracking.getHistory.invalidate();
      toast.success("Body composition data saved successfully!");
      
      // Reset form
      removeAllImages();
      setAiData(null);
    } catch (error) {
      console.error("Error saving tracking data:", error);
      toast.error("Failed to save tracking data");
    }
  };

  const getHealthRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'very_high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getObesityLevelColor = (level?: string) => {
    switch (level) {
      case 'underweight': return 'bg-blue-100 text-blue-800';
      case 'normal': return 'bg-green-100 text-green-800';
      case 'overweight': return 'bg-yellow-100 text-yellow-800';
      case 'obese': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            AI-Powered Body Composition Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload your body composition scale printout(s) for instant AI analysis with personalized recommendations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Images
                </>
              )}
            </Button>
            {uploadedImages.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviews(!showPreviews)}
                  className="w-full sm:w-auto"
                >
                  {showPreviews ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Hide Previews</span>
                      <span className="sm:hidden">Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Show Previews</span>
                      <span className="sm:hidden">Show</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeAllImages}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Remove All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </div>
            )}
          </div>

          {uploadedImages.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {uploadedImages.length} image(s) uploaded
            </div>
          )}

          {/* Image Previews */}
          {showPreviews && uploadedImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square relative border rounded-lg overflow-hidden">
                    <Image
                      src={image.preview}
                      alt={image.file.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    {image.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {uploadedImages.length > 0 && (
            <Button
              onClick={processImages}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Analyze {uploadedImages.length} Image{uploadedImages.length > 1 ? 's' : ''} with AI
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {aiData && (
        <>
          <Separator />
          
          <Tabs defaultValue="composition" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 mb-14">
              <TabsTrigger value="composition" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Body Composition</span>
                <span className="sm:hidden">Body</span>
              </TabsTrigger>
              <TabsTrigger value="segments" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Body Segments</span>
                <span className="sm:hidden">Segments</span>
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="text-xs sm:text-sm">
                <span className="hidden lg:inline">Nutrition Plan</span>
                <span className="lg:hidden">Nutrition</span>
              </TabsTrigger>
              <TabsTrigger value="fitness" className="text-xs sm:text-sm">
                <span className="hidden lg:inline">Fitness Plan</span>
                <span className="lg:hidden">Fitness</span>
              </TabsTrigger>
              <TabsTrigger value="lifestyle" className="text-xs sm:text-sm">
                <span className="hidden lg:inline">Lifestyle</span>
                <span className="lg:hidden">Life</span>
              </TabsTrigger>
            </TabsList>

            {/* Body Composition Tab */}
            <TabsContent value="composition" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Body Composition Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {aiData.composition.bmi && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.composition.bmi}</div>
                        <div className="text-sm text-muted-foreground">BMI</div>
                      </div>
                    )}
                    {aiData.composition.bodyFat && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.composition.bodyFat}%</div>
                        <div className="text-sm text-muted-foreground">Body Fat</div>
                      </div>
                    )}
                    {aiData.composition.muscleMass && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.composition.muscleMass}kg</div>
                        <div className="text-sm text-muted-foreground">Muscle Mass</div>
                      </div>
                    )}
                    {aiData.composition.bmr && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.composition.bmr}</div>
                        <div className="text-sm text-muted-foreground">BMR (kcal)</div>
                      </div>
                    )}
                    {aiData.composition.waterPercentage && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.composition.waterPercentage}%</div>
                        <div className="text-sm text-muted-foreground">Water</div>
                      </div>
                    )}
                    {aiData.composition.metabolicAge && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.composition.metabolicAge}</div>
                        <div className="text-sm text-muted-foreground">Metabolic Age</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Health Status */}
                  <div className="mt-4 space-y-2">
                    {aiData.obesity.obesityLevel && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Obesity Level:</span>
                        <Badge className={getObesityLevelColor(aiData.obesity.obesityLevel)}>
                          {aiData.obesity.obesityLevel}
                        </Badge>
                      </div>
                    )}
                    {aiData.obesity.healthRisk && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Health Risk:</span>
                        <Badge className={getHealthRiskColor(aiData.obesity.healthRisk)}>
                          {aiData.obesity.healthRisk.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Body Segments Tab */}
            <TabsContent value="segments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Body Segment Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiData.segment.rightArm && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.segment.rightArm}kg</div>
                        <div className="text-sm text-muted-foreground">Right Arm</div>
                      </div>
                    )}
                    {aiData.segment.leftArm && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.segment.leftArm}kg</div>
                        <div className="text-sm text-muted-foreground">Left Arm</div>
                      </div>
                    )}
                    {aiData.segment.trunk && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.segment.trunk}kg</div>
                        <div className="text-sm text-muted-foreground">Trunk</div>
                      </div>
                    )}
                    {aiData.segment.rightLeg && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.segment.rightLeg}kg</div>
                        <div className="text-sm text-muted-foreground">Right Leg</div>
                      </div>
                    )}
                    {aiData.segment.leftLeg && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{aiData.segment.leftLeg}kg</div>
                        <div className="text-sm text-muted-foreground">Left Leg</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nutrition Plan Tab */}
            <TabsContent value="nutrition" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="h-5 w-5" />
                    Personalized Nutrition Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Macronutrients */}
                  {aiData.suggestion.nutritionPlan?.macronutrients && (
                    <div>
                      <h4 className="font-semibold mb-3">Nutrisi Harian</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {aiData.suggestion.nutritionPlan.macronutrients.protein && (
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                              {aiData.suggestion.nutritionPlan.macronutrients.protein.grams}g
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Protein ({aiData.suggestion.nutritionPlan.macronutrients.protein.percentage}%)
                            </div>
                            <div className="mt-2 text-xs">
                              Sumber: {aiData.suggestion.nutritionPlan.macronutrients.protein.sources?.join(', ')}
                            </div>
                          </div>
                        )}
                        {aiData.suggestion.nutritionPlan.macronutrients.carbohydrates && (
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {aiData.suggestion.nutritionPlan.macronutrients.carbohydrates.grams}g
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Karbo ({aiData.suggestion.nutritionPlan.macronutrients.carbohydrates.percentage}%)
                            </div>
                            <div className="mt-2 text-xs">
                              Sumber: {aiData.suggestion.nutritionPlan.macronutrients.carbohydrates.sources?.join(', ')}
                            </div>
                          </div>
                        )}
                        {aiData.suggestion.nutritionPlan.macronutrients.fats && (
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {aiData.suggestion.nutritionPlan.macronutrients.fats.grams}g
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Lemak ({aiData.suggestion.nutritionPlan.macronutrients.fats.percentage}%)
                            </div>
                            <div className="mt-2 text-xs">
                              Sumber: {aiData.suggestion.nutritionPlan.macronutrients.fats.sources?.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Micronutrients */}
                  {aiData.suggestion.nutritionPlan?.micronutrients && (
                    <div>
                      <h4 className="font-semibold mb-3">Nutrisi Pelengkap</h4>
                      <div className="space-y-3">
                        {aiData.suggestion.nutritionPlan.micronutrients.map((micro, index) => (
                          <div key={index} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{micro.name}</div>
                                <div className="text-sm text-muted-foreground">{micro.dailyAmount}</div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm">
                              <div><strong>Sumber:</strong> {micro.sources.join(', ')}</div>
                              <div><strong>Tingkat Kepentingan:</strong> {micro.importance}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meal Timing & Hydration */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {aiData.suggestion.nutritionPlan?.mealTiming && (
                      <div>
                        <h4 className="font-semibold mb-2">Waktu Makan</h4>
                        <ul className="text-sm space-y-1">
                          {aiData.suggestion.nutritionPlan.mealTiming.map((timing, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              {timing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiData.suggestion.nutritionPlan?.hydration && (
                      <div>
                        <h4 className="font-semibold mb-2">Daily Hydration</h4>
                        <div className="text-sm bg-secondary p-3 rounded-lg">
                          {aiData.suggestion.nutritionPlan.hydration}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fitness Plan Tab */}
            <TabsContent value="fitness" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    Personalized Gym Workout Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {aiData.suggestion.gymWorkoutPlan && (
                    <>
                      {/* Intensity Level */}
                      {aiData.suggestion.gymWorkoutPlan.intensity && (
                        <div>
                          <span className="text-sm font-medium">Recommended Intensity: </span>
                          <Badge variant="outline" className="capitalize">
                            {aiData.suggestion.gymWorkoutPlan.intensity}
                          </Badge>
                        </div>
                      )}

                      {/* Weekly Schedule */}
                      {aiData.suggestion.gymWorkoutPlan.weeklySchedule && (
                        <div>
                          <h4 className="font-semibold mb-3">Jadwal Mingguan</h4>
                          <div className="space-y-2">
                            {aiData.suggestion.gymWorkoutPlan.weeklySchedule.map((day, index) => (
                              <div key={index} className="p-2 bg-muted rounded">
                                {day}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cardio & Strength Training */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {aiData.suggestion.gymWorkoutPlan.cardio && (
                          <div>
                            <h4 className="font-semibold mb-2">Cardio Exercises</h4>
                            <ul className="text-sm space-y-1">
                              {aiData.suggestion.gymWorkoutPlan.cardio.map((exercise, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-blue-600">•</span>
                                  {exercise}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiData.suggestion.gymWorkoutPlan.strengthTraining && (
                          <div>
                            <h4 className="font-semibold mb-2">Strength Training</h4>
                            <ul className="text-sm space-y-1">
                              {aiData.suggestion.gymWorkoutPlan.strengthTraining.map((exercise, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-red-600">•</span>
                                  {exercise}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Goals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiData.suggestion.targetWeight && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold">{aiData.suggestion.targetWeight}kg</div>
                        <div className="text-sm text-muted-foreground">Target Weight</div>
                      </div>
                    )}
                    {aiData.suggestion.estimatedTimeToGoal && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold">{aiData.suggestion.estimatedTimeToGoal}</div>
                        <div className="text-sm text-muted-foreground">Estimated Timeline</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lifestyle Tab */}
            <TabsContent value="lifestyle" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Lifestyle Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {aiData.suggestion.lifestyleHabits && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Sleep */}
                      {aiData.suggestion.lifestyleHabits.sleep && (
                        <div>
                          <h4 className="font-semibold mb-2">Sleep Optimization</h4>
                          <ul className="text-sm space-y-1">
                            {aiData.suggestion.lifestyleHabits.sleep.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-purple-600">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Stress Management */}
                      {aiData.suggestion.lifestyleHabits.stressManagement && (
                        <div>
                          <h4 className="font-semibold mb-2">Stress Management</h4>
                          <ul className="text-sm space-y-1">
                            {aiData.suggestion.lifestyleHabits.stressManagement.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Daily Habits */}
                      {aiData.suggestion.lifestyleHabits.dailyHabits && (
                        <div>
                          <h4 className="font-semibold mb-2">Daily Habits</h4>
                          <ul className="text-sm space-y-1">
                            {aiData.suggestion.lifestyleHabits.dailyHabits.map((habit, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-orange-600">•</span>
                                {habit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Supplementation */}
                      {aiData.suggestion.lifestyleHabits.supplementation && (
                        <div>
                          <h4 className="font-semibold mb-2">Supplementation</h4>
                          <ul className="text-sm space-y-1">
                            {aiData.suggestion.lifestyleHabits.supplementation.map((supplement, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                {supplement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Priority Areas */}
                  {aiData.suggestion.priorityAreas && aiData.suggestion.priorityAreas.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Priority Areas for Improvement</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiData.suggestion.priorityAreas.map((area, index) => (
                          <Badge key={index} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Recommendations */}
                  {aiData.suggestion.recommendations && aiData.suggestion.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">General Recommendations</h4>
                      <ul className="text-sm space-y-1">
                        {aiData.suggestion.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-indigo-600">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-center sm:justify-end">
            <Button
              onClick={saveTracking}
              disabled={saveTrackingMutation.isPending}
              className="min-w-[200px] w-full sm:w-auto"
            >
              {saveTrackingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Analysis Results
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};