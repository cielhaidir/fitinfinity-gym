/**
 * OCR Parser Utility
 * Parses OCR text from body composition scale printouts into structured data
 */

export interface CompositionData {
  weight?: number;
  fat?: number;
  fatRate?: number;
  muscle?: number;
  muscleRate?: number;
  water?: number;
  waterRate?: number;
  bone?: number;
  boneRate?: number;
  protein?: number;
  proteinRate?: number;
  [key: string]: any;
}

export interface SegmentData {
  leftArmMuscle?: number;
  rightArmMuscle?: number;
  leftLegMuscle?: number;
  rightLegMuscle?: number;
  trunkMuscle?: number;
  leftArmFat?: number;
  rightArmFat?: number;
  leftLegFat?: number;
  rightLegFat?: number;
  trunkFat?: number;
  [key: string]: any;
}

export interface ObesityData {
  bmi?: number;
  fatRate?: number;
  bmr?: number;
  vfa?: number; // Visceral Fat Area
  whr?: number; // Waist-Hip Ratio
  obesityStatus?: string;
  metabolicAge?: number;
  [key: string]: any;
}

export interface SuggestionData {
  bodyType?: string;
  idealWeight?: number;
  weightChange?: number;
  dci?: number; // Daily Calorie Intake
  dietRecommendation?: string;
  exerciseRecommendation?: string;
  [key: string]: any;
}

export interface ParsedOCRData {
  composition: CompositionData;
  segment: SegmentData;
  obesity: ObesityData;
  suggestion: SuggestionData;
}

/**
 * Extract numeric value from text using regex
 * @param text - Text to search
 * @param pattern - Regex pattern to match
 * @returns Extracted number or undefined
 */
function extractNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (match && match[1]) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

/**
 * Extract text value from text using regex
 * @param text - Text to search
 * @param pattern - Regex pattern to match
 * @returns Extracted text or undefined
 */
function extractText(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : undefined;
}

/**
 * Parse composition section from OCR text
 * @param text - OCR text
 * @returns Composition data
 */
function parseComposition(text: string): CompositionData {
  const composition: CompositionData = {};

  // Common patterns for body composition measurements
  composition.weight = extractNumber(text, /(?:weight|体重|berat)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  composition.fat = extractNumber(text, /(?:fat|lemak|脂肪)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  composition.fatRate = extractNumber(text, /(?:fat\s*rate|fat\s*%|lemak\s*%|脂肪率)[:\s]*([0-9.,]+)\s*%/i);
  composition.muscle = extractNumber(text, /(?:muscle|otot|筋肉)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  composition.muscleRate = extractNumber(text, /(?:muscle\s*rate|muscle\s*%|otot\s*%|筋肉率)[:\s]*([0-9.,]+)\s*%/i);
  composition.water = extractNumber(text, /(?:water|air|水分)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  composition.waterRate = extractNumber(text, /(?:water\s*rate|water\s*%|air\s*%|水分率)[:\s]*([0-9.,]+)\s*%/i);
  composition.bone = extractNumber(text, /(?:bone|tulang|骨量)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  composition.boneRate = extractNumber(text, /(?:bone\s*rate|bone\s*%|tulang\s*%|骨量率)[:\s]*([0-9.,]+)\s*%/i);
  composition.protein = extractNumber(text, /(?:protein|蛋白質)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  composition.proteinRate = extractNumber(text, /(?:protein\s*rate|protein\s*%|蛋白質率)[:\s]*([0-9.,]+)\s*%/i);

  return composition;
}

/**
 * Parse segment section from OCR text
 * @param text - OCR text
 * @returns Segment data
 */
function parseSegment(text: string): SegmentData {
  const segment: SegmentData = {};

  // Muscle segments
  segment.leftArmMuscle = extractNumber(text, /(?:left\s*arm|kiri\s*lengan|左腕)\s*(?:muscle|otot|筋肉)[:\s]*([0-9.,]+)/i);
  segment.rightArmMuscle = extractNumber(text, /(?:right\s*arm|kanan\s*lengan|右腕)\s*(?:muscle|otot|筋肉)[:\s]*([0-9.,]+)/i);
  segment.leftLegMuscle = extractNumber(text, /(?:left\s*leg|kiri\s*kaki|左脚)\s*(?:muscle|otot|筋肉)[:\s]*([0-9.,]+)/i);
  segment.rightLegMuscle = extractNumber(text, /(?:right\s*leg|kanan\s*kaki|右脚)\s*(?:muscle|otot|筋肉)[:\s]*([0-9.,]+)/i);
  segment.trunkMuscle = extractNumber(text, /(?:trunk|torso|badan|体幹)\s*(?:muscle|otot|筋肉)[:\s]*([0-9.,]+)/i);

  // Fat segments
  segment.leftArmFat = extractNumber(text, /(?:left\s*arm|kiri\s*lengan|左腕)\s*(?:fat|lemak|脂肪)[:\s]*([0-9.,]+)/i);
  segment.rightArmFat = extractNumber(text, /(?:right\s*arm|kanan\s*lengan|右腕)\s*(?:fat|lemak|脂肪)[:\s]*([0-9.,]+)/i);
  segment.leftLegFat = extractNumber(text, /(?:left\s*leg|kiri\s*kaki|左脚)\s*(?:fat|lemak|脂肪)[:\s]*([0-9.,]+)/i);
  segment.rightLegFat = extractNumber(text, /(?:right\s*leg|kanan\s*kaki|右脚)\s*(?:fat|lemak|脂肪)[:\s]*([0-9.,]+)/i);
  segment.trunkFat = extractNumber(text, /(?:trunk|torso|badan|体幹)\s*(?:fat|lemak|脂肪)[:\s]*([0-9.,]+)/i);

  return segment;
}

/**
 * Parse obesity section from OCR text
 * @param text - OCR text
 * @returns Obesity data
 */
function parseObesity(text: string): ObesityData {
  const obesity: ObesityData = {};

  obesity.bmi = extractNumber(text, /(?:bmi|body\s*mass\s*index)[:\s]*([0-9.,]+)/i);
  obesity.fatRate = extractNumber(text, /(?:body\s*fat|fat\s*rate|lemak\s*%)[:\s]*([0-9.,]+)\s*%/i);
  obesity.bmr = extractNumber(text, /(?:bmr|basal\s*metabolic\s*rate|metabolisme\s*basal)[:\s]*([0-9.,]+)/i);
  obesity.vfa = extractNumber(text, /(?:vfa|visceral\s*fat|lemak\s*visceral)[:\s]*([0-9.,]+)/i);
  obesity.whr = extractNumber(text, /(?:whr|waist\s*hip\s*ratio|rasio\s*pinggang)[:\s]*([0-9.,]+)/i);
  obesity.metabolicAge = extractNumber(text, /(?:metabolic\s*age|usia\s*metabolik|代謝年齢)[:\s]*([0-9.,]+)/i);

  // Extract obesity status
  obesity.obesityStatus = extractText(text, /(?:status|kategori)[:\s]*([^.\n\r]+)/i) ||
                          extractText(text, /(?:normal|underweight|overweight|obese|kurus|gemuk)/i);

  return obesity;
}

/**
 * Parse suggestion section from OCR text
 * @param text - OCR text
 * @returns Suggestion data
 */
function parseSuggestion(text: string): SuggestionData {
  const suggestion: SuggestionData = {};

  suggestion.bodyType = extractText(text, /(?:body\s*type|tipe\s*tubuh|体型)[:\s]*([^.\n\r]+)/i);
  suggestion.idealWeight = extractNumber(text, /(?:ideal\s*weight|berat\s*ideal|理想体重)[:\s]*([0-9.,]+)\s*(?:kg|kilogram)/i);
  suggestion.weightChange = extractNumber(text, /(?:weight\s*change|perubahan\s*berat)[:\s]*([+-]?[0-9.,]+)\s*(?:kg|kilogram)/i);
  suggestion.dci = extractNumber(text, /(?:dci|daily\s*calorie|kalori\s*harian)[:\s]*([0-9.,]+)/i);

  // Extract recommendations
  suggestion.dietRecommendation = extractText(text, /(?:diet|makanan)[:\s]*([^.\n\r]+)/i);
  suggestion.exerciseRecommendation = extractText(text, /(?:exercise|olahraga|運動)[:\s]*([^.\n\r]+)/i);

  return suggestion;
}

/**
 * Main function to parse OCR text into structured data
 * @param ocrText - Complete OCR text from body composition scale
 * @returns Parsed structured data
 */
export function parseOCRText(ocrText: string): ParsedOCRData {
  // Clean and normalize the text
  const cleanText = ocrText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  // Split text into sections based on common headers
  const sections = {
    composition: '',
    segment: '',
    obesity: '',
    suggestion: ''
  };

  // Try to identify sections by headers
  const compositionMatch = cleanText.match(/(?:composition|komposisi|体組成)(.*?)(?=segment|obesity|suggestion|$)/is);
  const segmentMatch = cleanText.match(/(?:segment|segmen|部位別)(.*?)(?=composition|obesity|suggestion|$)/is);
  const obesityMatch = cleanText.match(/(?:obesity|obesitas|肥満)(.*?)(?=composition|segment|suggestion|$)/is);
  const suggestionMatch = cleanText.match(/(?:suggestion|saran|提案)(.*?)(?=composition|segment|obesity|$)/is);

  sections.composition = compositionMatch ? (compositionMatch[1] || cleanText) : cleanText;
  sections.segment = segmentMatch ? (segmentMatch[1] || cleanText) : cleanText;
  sections.obesity = obesityMatch ? (obesityMatch[1] || cleanText) : cleanText;
  sections.suggestion = suggestionMatch ? (suggestionMatch[1] || cleanText) : cleanText;

  // Parse each section
  const parsedData: ParsedOCRData = {
    composition: parseComposition(sections.composition),
    segment: parseSegment(sections.segment),
    obesity: parseObesity(sections.obesity),
    suggestion: parseSuggestion(sections.suggestion)
  };

  // If sections weren't clearly separated, try parsing the whole text
  if (Object.keys(parsedData.composition).length === 0 &&
      Object.keys(parsedData.segment).length === 0 &&
      Object.keys(parsedData.obesity).length === 0 &&
      Object.keys(parsedData.suggestion).length === 0) {
    
    return {
      composition: parseComposition(cleanText),
      segment: parseSegment(cleanText),
      obesity: parseObesity(cleanText),
      suggestion: parseSuggestion(cleanText)
    };
  }

  return parsedData;
}

/**
 * Validate parsed OCR data and provide fallback values
 * @param data - Parsed OCR data
 * @returns Validated and cleaned data
 */
export function validateParsedData(data: ParsedOCRData): ParsedOCRData {
  // Remove undefined/null values and ensure we have objects
  const cleanObject = (obj: any) => {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj || {})) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  return {
    composition: cleanObject(data.composition),
    segment: cleanObject(data.segment),
    obesity: cleanObject(data.obesity),
    suggestion: cleanObject(data.suggestion)
  };
}