"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Switch } from "@/app/_components/ui/switch";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";

type FormFieldType = "TEXT" | "EMAIL" | "PHONE" | "NUMBER" | "TEXTAREA" | "SELECT" | "RADIO" | "CHECKBOX" | "DATE" | "TIME" | "RATING" | "FILE";

interface FormField {
  id?: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  options?: { value: string; label: string }[];
  order: number;
  width: "full" | "half" | "third";
}

const FIELD_TYPES = [
  { value: "TEXT", label: "Text Input" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "NUMBER", label: "Number" },
  { value: "TEXTAREA", label: "Long Text" },
  { value: "SELECT", label: "Dropdown" },
  { value: "RADIO", label: "Radio Buttons" },
  { value: "CHECKBOX", label: "Checkboxes" },
  { value: "DATE", label: "Date" },
  { value: "TIME", label: "Time" },
  { value: "RATING", label: "Rating" },
].filter(type => type.value && type.value.trim() !== ""); // Filter out any empty values

export default function CreateFormPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    slug: "",
    backgroundColor: "#ffffff",
    primaryColor: "#BAD45E",
    requireAuth: false,
    allowMultiple: true,
    showProgress: true,
    notifyOnSubmit: false,
    notifyEmails: [] as string[],
    thankYouTitle: "Thank you!",
    thankYouMessage: "Your response has been recorded.",
    redirectUrl: "",
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [notifyEmail, setNotifyEmail] = useState("");

  const createMutation = api.publicForm.create.useMutation({
    onSuccess: (data) => {
      toast.success("Form created successfully!");
      router.push(`/admin/forms/${data.id}/edit`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const addField = () => {
    const newField: FormField = {
      type: "TEXT",
      label: "New Field",
      required: false,
      order: fields.length,
      width: "full"
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, field: Partial<FormField>) => {
    const updatedFields = [...fields];
    if (updatedFields[index]) {
      updatedFields[index] = { ...updatedFields[index], ...field };
      setFields(updatedFields);
    }
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields.map((field, i) => ({ ...field, order: i })));
  };

  const addOption = (fieldIndex: number) => {
    const updatedFields = [...fields];
    const field = updatedFields[fieldIndex];
    if (field) {
      if (!field.options) field.options = [];
      const optionIndex = field.options.length + 1;
      field.options.push({
        value: `option_${optionIndex}`,
        label: `Option ${optionIndex}`
      });
      setFields(updatedFields);
    }
  };

  const updateOption = (fieldIndex: number, optionIndex: number, option: Partial<{ value: string; label: string }>) => {
    const updatedFields = [...fields];
    const field = updatedFields[fieldIndex];
    if (field && field.options && field.options[optionIndex]) {
      // Ensure value is not empty - if empty, generate a default value
      const updatedOption = { ...field.options[optionIndex], ...option };
      if (option.value !== undefined && option.value.trim() === '') {
        updatedOption.value = `option_${optionIndex + 1}`;
      }
      field.options[optionIndex] = updatedOption;
      setFields(updatedFields);
    }
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updatedFields = [...fields];
    const field = updatedFields[fieldIndex];
    if (field && field.options) {
      field.options.splice(optionIndex, 1);
      setFields(updatedFields);
    }
  };

  const addNotifyEmail = () => {
    if (notifyEmail && !formData.notifyEmails.includes(notifyEmail)) {
      setFormData(prev => ({
        ...prev,
        notifyEmails: [...prev.notifyEmails, notifyEmail]
      }));
      setNotifyEmail("");
    }
  };

  const removeNotifyEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      notifyEmails: prev.notifyEmails.filter(e => e !== email)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Form title is required");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("Form slug is required");
      return;
    }

    // Validate fields have no empty option values
    for (const field of fields) {
      if (needsOptions(field.type) && field.options) {
        for (const option of field.options) {
          if (!option.value.trim() || !option.label.trim()) {
            toast.error(`All options for field "${field.label}" must have both value and label`);
            return;
          }
        }
      }
    }

    createMutation.mutate({
      ...formData,
      fields
    });
  };

  const needsOptions = (type: string) => ["SELECT", "RADIO", "CHECKBOX"].includes(type);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/forms">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create New Form</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Form Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter form title"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="form-url-slug"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Your form will be available at: /forms/{formData.slug}
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your form"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Form Fields</CardTitle>
              <Button type="button" onClick={addField} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No fields added yet. Click "Add Field" to get started.</p>
              </div>
            ) : (
              fields.map((field, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Field Type</Label>
                            <Select
                              value={field.type || "TEXT"}
                              onValueChange={(value) => {
                                updateField(index, { type: value as FormFieldType });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Field Width</Label>
                            <Select
                              value={field.width || "full"}
                              onValueChange={(value) => {
                                updateField(index, { width: value as "full" | "half" | "third" });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select width" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full Width</SelectItem>
                                <SelectItem value="half">Half Width</SelectItem>
                                <SelectItem value="third">One Third</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>Label *</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Field label"
                            required
                          />
                        </div>

                        <div>
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Placeholder text"
                          />
                        </div>

                        <div>
                          <Label>Help Text</Label>
                          <Input
                            value={field.helpText || ""}
                            onChange={(e) => updateField(index, { helpText: e.target.value })}
                            placeholder="Additional help text"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(index, { required: checked })}
                          />
                          <Label>Required field</Label>
                        </div>

                        {/* Options for select/radio/checkbox fields */}
                        {needsOptions(field.type) && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label>Options</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(index)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {field.options?.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2">
                                  <Input
                                    placeholder="Option value"
                                    value={option.value}
                                    onChange={(e) => updateOption(index, optionIndex, { value: e.target.value })}
                                  />
                                  <Input
                                    placeholder="Option label"
                                    value={option.label}
                                    onChange={(e) => updateOption(index, optionIndex, { label: e.target.value })}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeOption(index, optionIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeField(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backgroundColor">Background Color</Label>
                <Input
                  id="backgroundColor"
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.requireAuth}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireAuth: checked }))}
                />
                <Label>Require login to submit</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.allowMultiple}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowMultiple: checked }))}
                />
                <Label>Allow multiple submissions per user</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.showProgress}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showProgress: checked }))}
                />
                <Label>Show progress indicator</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.notifyOnSubmit}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyOnSubmit: checked }))}
                />
                <Label>Send email notifications on new submissions</Label>
              </div>
            </div>

            {formData.notifyOnSubmit && (
              <div>
                <Label>Notification Emails</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="Enter email address"
                    type="email"
                  />
                  <Button type="button" onClick={addNotifyEmail} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.notifyEmails.map((email) => (
                    <div key={email} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                      <span className="text-sm">{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotifyEmail(email)}
                        className="h-4 w-4 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thank You Page */}
        <Card>
          <CardHeader>
            <CardTitle>Thank You Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="thankYouTitle">Thank You Title</Label>
              <Input
                id="thankYouTitle"
                value={formData.thankYouTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, thankYouTitle: e.target.value }))}
                placeholder="Thank you!"
              />
            </div>

            <div>
              <Label htmlFor="thankYouMessage">Thank You Message</Label>
              <Textarea
                id="thankYouMessage"
                value={formData.thankYouMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                placeholder="Your response has been recorded."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
              <Input
                id="redirectUrl"
                value={formData.redirectUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, redirectUrl: e.target.value }))}
                placeholder="https://your-website.com/thank-you"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to show the default thank you page
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/forms">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Form"}
          </Button>
        </div>
      </form>
    </div>
  );
}