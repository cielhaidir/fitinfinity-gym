"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Upload, X, Loader2, Save, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

interface CompositionData {
  bmi?: number;
  bmr?: number;
  vfa?: number;
  bodyFat?: number;
  muscleMass?: number;
  boneMass?: number;
  waterPercentage?: number;
  proteinPercentage?: number;
  [key: string]: any;
}

interface SegmentData {
  rightArm?: number;
  leftArm?: number;
  trunk?: number;
  rightLeg?: number;
  leftLeg?: number;
  [key: string]: any;
}

interface ObesityData {
  visceralFat?: number;
  subcutaneousFat?: number;
  totalBodyFat?: number;
  fatMassIndex?: number;
  [key: string]: any;
}

interface SuggestionData {
  recommendations?: string[];
  targetWeight?: number;
  targetBMI?: number;
  exerciseRecommendations?: string[];
  dietaryAdvice?: string[];
  [key: string]: any;
}

interface ParsedOCRData {
  composition: CompositionData;
  segment: SegmentData;
  obesity: ObesityData;
  suggestion: SuggestionData;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
}

export const OCRUploadAndEditForm: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedOCRData>({
    composition: {},
    segment: {},
    obesity: {},
    suggestion: {},
  });

  const extractOCRMutation = api.tracking.extractOCR.useMutation();
  const saveTrackingMutation = api.tracking.saveTracking.useMutation();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newImages: UploadedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`);
          continue;
        }

        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
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

  const processOCR = async () => {
    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsProcessing(true);

    try {
      const base64Images = uploadedImages.map((img) => img.base64);
      const result = await extractOCRMutation.mutateAsync({ 
        images: base64Images,
        enhanceWithAI: true 
      });

      if (result.success && result.data) {
        setParsedData(result.data);
        setRawText(result.rawText || "");
        toast.success(`OCR processing completed${result.aiEnhanced ? ' with AI enhancement' : ''}`);
      } else {
        toast.error(result.error || "Failed to process OCR");
      }
    } catch (error) {
      console.error("Error processing OCR:", error);
      toast.error("Failed to process OCR. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTracking = async () => {
    try {
      await saveTrackingMutation.mutateAsync({
        ...parsedData,
        rawText: rawText,
      });
      toast.success("Tracking data saved successfully");
      
      // Reset form
      setUploadedImages([]);
      setRawText("");
      setParsedData({
        composition: {},
        segment: {},
        obesity: {},
        suggestion: {},
      });
    } catch (error) {
      console.error("Error saving tracking data:", error);
      toast.error("Failed to save tracking data");
    }
  };

  const updateCompositionField = (field: string, value: any) => {
    setParsedData((prev) => ({
      ...prev,
      composition: { ...prev.composition, [field]: value },
    }));
  };

  const updateSegmentField = (field: string, value: any) => {
    setParsedData((prev) => ({
      ...prev,
      segment: { ...prev.segment, [field]: value },
    }));
  };

  const updateObesityField = (field: string, value: any) => {
    setParsedData((prev) => ({
      ...prev,
      obesity: { ...prev.obesity, [field]: value },
    }));
  };

  const updateSuggestionField = (field: string, value: any) => {
    setParsedData((prev) => ({
      ...prev,
      suggestion: { ...prev.suggestion, [field]: value },
    }));
  };

  const hasData = Object.keys(parsedData.composition).length > 0 ||
                  Object.keys(parsedData.segment).length > 0 ||
                  Object.keys(parsedData.obesity).length > 0 ||
                  Object.keys(parsedData.suggestion).length > 0;

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Body Composition Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreviews(!showPreviews)}
              >
                {showPreviews ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide Previews
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show Previews
                  </>
                )}
              </Button>
            )}
          </div>

          {uploadedImages.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {uploadedImages.length} image(s) uploaded
            </div>
          )}

          {/* Image Previews */}
          {showPreviews && uploadedImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              onClick={processOCR}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing OCR...
                </>
              ) : (
                "Process OCR"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Editable Form Sections */}
      {hasData && (
        <>
          <Separator />
          
          {/* Composition Data */}
          <Card>
            <CardHeader>
              <CardTitle>Body Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">BMI</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.composition.bmi || ""}
                    onChange={(e) => updateCompositionField("bmi", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter BMI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">BMR (kcal)</label>
                  <Input
                    type="number"
                    value={parsedData.composition.bmr || ""}
                    onChange={(e) => updateCompositionField("bmr", parseInt(e.target.value) || undefined)}
                    placeholder="Enter BMR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">VFA</label>
                  <Input
                    type="number"
                    value={parsedData.composition.vfa || ""}
                    onChange={(e) => updateCompositionField("vfa", parseInt(e.target.value) || undefined)}
                    placeholder="Enter VFA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Body Fat (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.composition.bodyFat || ""}
                    onChange={(e) => updateCompositionField("bodyFat", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter body fat %"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Muscle Mass (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.composition.muscleMass || ""}
                    onChange={(e) => updateCompositionField("muscleMass", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter muscle mass"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Water (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.composition.waterPercentage || ""}
                    onChange={(e) => updateCompositionField("waterPercentage", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter water %"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segment Data */}
          <Card>
            <CardHeader>
              <CardTitle>Body Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Right Arm (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.segment.rightArm || ""}
                    onChange={(e) => updateSegmentField("rightArm", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter right arm mass"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Left Arm (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.segment.leftArm || ""}
                    onChange={(e) => updateSegmentField("leftArm", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter left arm mass"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trunk (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.segment.trunk || ""}
                    onChange={(e) => updateSegmentField("trunk", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter trunk mass"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Right Leg (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.segment.rightLeg || ""}
                    onChange={(e) => updateSegmentField("rightLeg", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter right leg mass"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Left Leg (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.segment.leftLeg || ""}
                    onChange={(e) => updateSegmentField("leftLeg", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter left leg mass"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Obesity Data */}
          <Card>
            <CardHeader>
              <CardTitle>Obesity Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Visceral Fat</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.obesity.visceralFat || ""}
                    onChange={(e) => updateObesityField("visceralFat", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter visceral fat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subcutaneous Fat</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.obesity.subcutaneousFat || ""}
                    onChange={(e) => updateObesityField("subcutaneousFat", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter subcutaneous fat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Body Fat (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.obesity.totalBodyFat || ""}
                    onChange={(e) => updateObesityField("totalBodyFat", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter total body fat %"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fat Mass Index</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={parsedData.obesity.fatMassIndex || ""}
                    onChange={(e) => updateObesityField("fatMassIndex", parseFloat(e.target.value) || undefined)}
                    placeholder="Enter fat mass index"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>AI Suggestions & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">General Recommendations</label>
                  <Textarea
                    value={Array.isArray(parsedData.suggestion.recommendations) 
                      ? parsedData.suggestion.recommendations.join('\n') 
                      : parsedData.suggestion.recommendations || ""}
                    onChange={(e) => updateSuggestionField("recommendations", e.target.value.split('\n').filter(line => line.trim()))}
                    placeholder="Enter recommendations (one per line)"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Weight (kg)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={parsedData.suggestion.targetWeight || ""}
                      onChange={(e) => updateSuggestionField("targetWeight", parseFloat(e.target.value) || undefined)}
                      placeholder="Enter target weight"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Target BMI</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={parsedData.suggestion.targetBMI || ""}
                      onChange={(e) => updateSuggestionField("targetBMI", parseFloat(e.target.value) || undefined)}
                      placeholder="Enter target BMI"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exercise Recommendations</label>
                  <Textarea
                    value={Array.isArray(parsedData.suggestion.exerciseRecommendations) 
                      ? parsedData.suggestion.exerciseRecommendations.join('\n') 
                      : parsedData.suggestion.exerciseRecommendations || ""}
                    onChange={(e) => updateSuggestionField("exerciseRecommendations", e.target.value.split('\n').filter(line => line.trim()))}
                    placeholder="Enter exercise recommendations (one per line)"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dietary Advice</label>
                  <Textarea
                    value={Array.isArray(parsedData.suggestion.dietaryAdvice) 
                      ? parsedData.suggestion.dietaryAdvice.join('\n') 
                      : parsedData.suggestion.dietaryAdvice || ""}
                    onChange={(e) => updateSuggestionField("dietaryAdvice", e.target.value.split('\n').filter(line => line.trim()))}
                    placeholder="Enter dietary advice (one per line)"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveTracking}
              disabled={saveTrackingMutation.isPending}
              className="min-w-[150px]"
            >
              {saveTrackingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Tracking Data
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};