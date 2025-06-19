import { z } from "zod";
import { createTRPCRouter, publicProcedure, permissionProtectedProcedure } from "../trpc";
import { type FormFieldType, type FormStatus } from "@prisma/client";

// Validation schemas
const FormFieldTypeEnum = z.enum([
  "TEXT",
  "EMAIL", 
  "PHONE",
  "NUMBER",
  "TEXTAREA",
  "SELECT",
  "RADIO",
  "CHECKBOX",
  "DATE",
  "TIME",
  "FILE",
  "RATING"
]);

const FormStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const FormFieldSchema = z.object({
  id: z.string().optional(),
  type: FormFieldTypeEnum,
  label: z.string().min(1, "Label is required"),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).optional(),
  order: z.number(),
  width: z.enum(["full", "half", "third"]).default("full")
});

export const publicFormRouter = createTRPCRouter({
  // Admin operations - Create form
  create: permissionProtectedProcedure(["create:public-form"])
    .input(z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
      backgroundColor: z.string().optional(),
      primaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
      requireAuth: z.boolean().default(false),
      allowMultiple: z.boolean().default(true),
      showProgress: z.boolean().default(true),
      notifyOnSubmit: z.boolean().default(false),
      notifyEmails: z.array(z.string().email()).default([]),
      thankYouTitle: z.string().optional(),
      thankYouMessage: z.string().optional(),
      redirectUrl: z.string().optional(),
      fields: z.array(FormFieldSchema).default([])
    }))
    .mutation(async ({ ctx, input }) => {
      const { fields, ...formData } = input;
      
      // Check if slug is unique
      const existingForm = await ctx.db.publicForm.findUnique({
        where: { slug: input.slug }
      });
      
      if (existingForm) {
        throw new Error("A form with this slug already exists");
      }

      // Create form with fields
      const form = await ctx.db.publicForm.create({
        data: {
          ...formData,
          createdBy: ctx.session.user.id,
          fields: {
            create: fields.map((field, index) => ({
              ...field,
              order: index,
              options: field.options ? JSON.stringify(field.options) : undefined
            }))
          }
        },
        include: {
          fields: {
            orderBy: { order: 'asc' }
          }
        }
      });

      return form;
    }),

  // Admin operations - Update form
  update: permissionProtectedProcedure(["update:public-form"])
    .input(z.object({
      id: z.string(),
      title: z.string().min(1, "Title is required").optional(),
      description: z.string().optional(),
      slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
      status: FormStatusEnum.optional(),
      backgroundColor: z.string().optional(),
      primaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
      requireAuth: z.boolean().optional(),
      allowMultiple: z.boolean().optional(),
      showProgress: z.boolean().optional(),
      notifyOnSubmit: z.boolean().optional(),
      notifyEmails: z.array(z.string().email()).optional(),
      thankYouTitle: z.string().optional(),
      thankYouMessage: z.string().optional(),
      redirectUrl: z.string().optional(),
      fields: z.array(FormFieldSchema).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, fields, slug, ...updateData } = input;
      
      // Check if user owns this form
      const existingForm = await ctx.db.publicForm.findFirst({
        where: { 
          id,
          createdBy: ctx.session.user.id 
        }
      });
      
      if (!existingForm) {
        throw new Error("Form not found or you don't have permission to update it");
      }

      // Check slug uniqueness if updating slug
      if (slug && slug !== existingForm.slug) {
        const slugExists = await ctx.db.publicForm.findFirst({
          where: { 
            slug,
            id: { not: id }
          }
        });
        
        if (slugExists) {
          throw new Error("A form with this slug already exists");
        }
      }

      // Update form
      const updatedForm = await ctx.db.publicForm.update({
        where: { id },
        data: {
          ...updateData,
          ...(slug && { slug }),
        },
        include: {
          fields: {
            orderBy: { order: 'asc' }
          }
        }
      });

      // Update fields if provided
      if (fields) {
        // Delete existing fields
        await ctx.db.formField.deleteMany({
          where: { formId: id }
        });

        // Create new fields
        await ctx.db.formField.createMany({
          data: fields.map((field, index) => ({
            ...field,
            formId: id,
            order: index,
            options: field.options ? JSON.stringify(field.options) : undefined
          }))
        });
      }

      return updatedForm;
    }),

  // Admin operations - Delete form
  delete: permissionProtectedProcedure(["delete:public-form"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns this form
      const existingForm = await ctx.db.publicForm.findFirst({
        where: { 
          id: input.id,
          createdBy: ctx.session.user.id 
        }
      });
      
      if (!existingForm) {
        throw new Error("Form not found or you don't have permission to delete it");
      }

      return ctx.db.publicForm.delete({
        where: { id: input.id }
      });
    }),

  // Admin operations - Get all forms for current user
  getAll: permissionProtectedProcedure(["list:public-form"])
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(10),
      search: z.string().optional(),
      status: FormStatusEnum.optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, status } = input;
      const skip = (page - 1) * pageSize;

      const where: any = {
        createdBy: ctx.session.user.id
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (status) {
        where.status = status;
      }

      const [forms, total] = await Promise.all([
        ctx.db.publicForm.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                responses: true,
                fields: true
              }
            }
          }
        }),
        ctx.db.publicForm.count({ where })
      ]);

      return {
        forms,
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page
      };
    }),

  // Admin operations - Get form by ID for editing
  getById: permissionProtectedProcedure(["show:public-form"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await ctx.db.publicForm.findFirst({
        where: { 
          id: input.id,
          createdBy: ctx.session.user.id 
        },
        include: {
          fields: {
            orderBy: { order: 'asc' }
          },
          _count: {
            select: { responses: true }
          }
        }
      });

      if (!form) {
        throw new Error("Form not found or you don't have permission to view it");
      }

      // Parse options for fields
      const formWithParsedFields = {
        ...form,
        fields: form.fields.map(field => ({
          ...field,
          options: field.options ? JSON.parse(field.options as string) : null
        }))
      };

      return formWithParsedFields;
    }),

  // Public operations - Get form by slug for display
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await ctx.db.publicForm.findUnique({
        where: { 
          slug: input.slug,
          status: "PUBLISHED",
          isActive: true
        },
        include: {
          fields: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!form) {
        throw new Error("Form not found or not available");
      }

      // Parse options for fields
      const formWithParsedFields = {
        ...form,
        fields: form.fields.map(field => ({
          ...field,
          options: field.options ? JSON.parse(field.options as string) : null
        }))
      };

      return formWithParsedFields;
    }),

  // Public operations - Submit form response
  submit: publicProcedure
    .input(z.object({
      formSlug: z.string(),
      responses: z.record(z.string(), z.any()),
      respondentEmail: z.string().email().optional(),
      respondentName: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get form
      const form = await ctx.db.publicForm.findUnique({
        where: { 
          slug: input.formSlug,
          status: "PUBLISHED",
          isActive: true
        },
        include: {
          fields: true
        }
      });

      if (!form) {
        throw new Error("Form not found or not available");
      }

      // Validate required fields
      const requiredFields = form.fields.filter(field => field.required);
      for (const field of requiredFields) {
        if (!input.responses[field.id] || input.responses[field.id] === '') {
          throw new Error(`Field "${field.label}" is required`);
        }
      }

      // Create response
      const response = await ctx.db.formResponse.create({
        data: {
          formId: form.id,
          respondentEmail: input.respondentEmail,
          respondentName: input.respondentName,
          fieldResponses: {
            create: Object.entries(input.responses).map(([fieldId, value]) => ({
              fieldId,
              value: typeof value === 'string' ? value : JSON.stringify(value)
            }))
          }
        },
        include: {
          fieldResponses: {
            include: {
              field: true
            }
          }
        }
      });

      // TODO: Send email notifications if enabled
      // TODO: Send confirmation email to respondent if email provided

      return {
        success: true,
        responseId: response.id,
        thankYouTitle: form.thankYouTitle,
        thankYouMessage: form.thankYouMessage,
        redirectUrl: form.redirectUrl
      };
    }),

  // Admin operations - Get form responses
  getResponses: permissionProtectedProcedure(["list:form-response"])
    .input(z.object({
      formId: z.string(),
      page: z.number().default(1),
      pageSize: z.number().default(10),
      search: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { formId, page, pageSize, search } = input;
      const skip = (page - 1) * pageSize;

      // Check if user owns this form
      const form = await ctx.db.publicForm.findFirst({
        where: { 
          id: formId,
          createdBy: ctx.session.user.id 
        }
      });
      
      if (!form) {
        throw new Error("Form not found or you don't have permission to view responses");
      }

      const where: any = { formId };

      if (search) {
        where.OR = [
          { respondentName: { contains: search, mode: 'insensitive' } },
          { respondentEmail: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [responses, total] = await Promise.all([
        ctx.db.formResponse.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { submittedAt: 'desc' },
          include: {
            fieldResponses: {
              include: {
                field: true
              }
            }
          }
        }),
        ctx.db.formResponse.count({ where })
      ]);

      return {
        responses: responses.map(response => ({
          ...response,
          fieldResponses: response.fieldResponses.map(fr => ({
            ...fr,
            field: {
              ...fr.field,
              options: fr.field.options ? JSON.parse(fr.field.options as string) : null
            }
          }))
        })),
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page
      };
    }),

  // Admin operations - Get single response
  getResponse: permissionProtectedProcedure(["show:form-response"])
    .input(z.object({ responseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const response = await ctx.db.formResponse.findUnique({
        where: { id: input.responseId },
        include: {
          form: true,
          fieldResponses: {
            include: {
              field: true
            }
          }
        }
      });

      if (!response) {
        throw new Error("Response not found");
      }

      // Check if user owns the form
      if (response.form.createdBy !== ctx.session.user.id) {
        throw new Error("You don't have permission to view this response");
      }

      return {
        ...response,
        fieldResponses: response.fieldResponses.map(fr => ({
          ...fr,
          field: {
            ...fr.field,
            options: fr.field.options ? JSON.parse(fr.field.options as string) : null
          }
        }))
      };
    }),

  // Admin operations - Export responses
  exportResponses: permissionProtectedProcedure(["export:form-response"])
    .input(z.object({ 
      formId: z.string(),
      format: z.enum(["csv", "json"]).default("csv")
    }))
    .query(async ({ ctx, input }) => {
      // Check if user owns this form
      const form = await ctx.db.publicForm.findFirst({
        where: { 
          id: input.formId,
          createdBy: ctx.session.user.id 
        },
        include: {
          fields: {
            orderBy: { order: 'asc' }
          }
        }
      });
      
      if (!form) {
        throw new Error("Form not found or you don't have permission to export responses");
      }

      const responses = await ctx.db.formResponse.findMany({
        where: { formId: input.formId },
        include: {
          fieldResponses: {
            include: {
              field: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' }
      });

      return {
        form,
        responses: responses.map(response => ({
          ...response,
          fieldResponses: response.fieldResponses.map(fr => ({
            ...fr,
            field: {
              ...fr.field,
              options: fr.field.options ? JSON.parse(fr.field.options as string) : null
            }
          }))
        }))
      };
    })
});