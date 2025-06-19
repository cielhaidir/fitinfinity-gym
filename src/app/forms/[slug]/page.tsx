"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/app/_components/ui/radio-group";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Progress } from "@/app/_components/ui/progress";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface FormResponse {
  [fieldId: string]: any;
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [responses, setResponses] = useState<FormResponse>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: form, isLoading, error } = api.publicForm.getBySlug.useQuery({ slug });

  const submitMutation = api.publicForm.submit.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push(`/forms/thank-you?title=${encodeURIComponent(data.thankYouTitle || "Thank you!")}&message=${encodeURIComponent(data.thankYouMessage || "Your response has been recorded.")}`);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(error.message);
    },
  });

  const updateResponse = (fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateField = (field: any, value: any) => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} is required`;
    }

    if (field.type === 'EMAIL' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }

    if (field.type === 'PHONE' && value && !/^\+?[\d\s\-\(\)]+$/.test(value)) {
      return 'Please enter a valid phone number';
    }

    if (field.minLength && value && value.length < field.minLength) {
      return `Minimum length is ${field.minLength} characters`;
    }

    if (field.maxLength && value && value.length > field.maxLength) {
      return `Maximum length is ${field.maxLength} characters`;
    }

    if (field.type === 'NUMBER' && value) {
      const num = Number(value);
      if (isNaN(num)) {
        return 'Please enter a valid number';
      }
      if (field.minValue !== undefined && num < field.minValue) {
        return `Minimum value is ${field.minValue}`;
      }
      if (field.maxValue !== undefined && num > field.maxValue) {
        return `Maximum value is ${field.maxValue}`;
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate all required fields
    const errors: string[] = [];
    form.fields.forEach(field => {
      const error = validateField(field, responses[field.id]);
      if (error) {
        errors.push(error);
      }
    });

    if (errors.length > 0) {
      toast.error(`Please fix the following errors:\n${errors.join('\n')}`);
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate({
      formSlug: slug,
      responses,
      respondentEmail: responses.email || undefined,
      respondentName: responses.name || undefined
    });
  };

  const renderField = (field: any) => {
    const value = responses[field.id] || '';

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
        return (
          <Input
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => updateResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            min={field.minValue}
            max={field.maxValue}
            required={field.required}
          />
        );

      case 'TEXTAREA':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
          />
        );

      case 'SELECT':
        return (
          <Select value={value} onValueChange={(val) => updateResponse(field.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'RADIO':
        return (
          <RadioGroup value={value} onValueChange={(val) => updateResponse(field.id, val)}>
            {field.options?.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'CHECKBOX':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option.value}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateResponse(field.id, [...selectedValues, option.value]);
                    } else {
                      updateResponse(field.id, selectedValues.filter((v: any) => v !== option.value));
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateResponse(field.id, e.target.value)}
            required={field.required}
          />
        );

      case 'TIME':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => updateResponse(field.id, e.target.value)}
            required={field.required}
          />
        );

      case 'RATING':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateResponse(field.id, rating)}
                className={`p-1 ${value >= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Form Not Found</h2>
            <p className="text-gray-600">
              The form you're looking for doesn't exist or is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = form.showProgress && form.fields.length > 0 
    ? (Object.keys(responses).length / form.fields.length) * 100 
    : 0;

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ 
        backgroundColor: form.backgroundColor || '#ffffff',
        '--primary-color': form.primaryColor || '#BAD45E'
      } as React.CSSProperties}
    >
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{form.title}</CardTitle>
            {form.description && (
              <p className="text-gray-600 mt-2">{form.description}</p>
            )}
            {form.showProgress && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {form.fields.map((field: any) => (
                  <div 
                    key={field.id}
                    className={`space-y-2 ${
                      field.width === 'half' ? 'w-1/2' : 
                      field.width === 'third' ? 'w-1/3' : 
                      'w-full'
                    }`}
                  >
                    <Label htmlFor={field.id} className="font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {renderField(field)}
                    
                    {field.helpText && (
                      <p className="text-sm text-gray-500">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full"
                  style={{ backgroundColor: form.primaryColor || '#BAD45E' }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}