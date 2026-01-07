import { z } from 'zod';

// Review form validation
export const reviewSchema = z.object({
  title: z.string().max(100, 'Title must be less than 100 characters').optional(),
  content: z.string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review must be less than 5000 characters'),
  rating: z.number().int().min(1).max(5),
});

// Forum thread validation
export const forumThreadSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content must be less than 10000 characters'),
});

// Chat message validation
export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters'),
});

// Chat start form validation
export const chatStartSchema = z.object({
  customerName: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  customerEmail: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  issueCategory: z.string().min(1, 'Please select an issue category'),
  issueDescription: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
});

// Job application validation
export const jobApplicationSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  applicant_name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  applicant_email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  discord_username: z.string()
    .max(100, 'Discord username must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  portfolio_url: z.string()
    .url('Invalid URL')
    .max(500, 'URL must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  experience: z.string()
    .max(5000, 'Experience must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
  message: z.string()
    .min(10, 'Please write at least 10 characters')
    .max(5000, 'Message must be less than 5000 characters'),
});

// Contact form validation
export const contactFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be less than 5000 characters'),
});

// Application status check validation
export const emailCheckSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
});

// Type guards for validation results
export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationError = { success: false; error: string };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// Helper function to validate and return first error
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  return { success: false, error: firstError?.message || 'Validation failed' };
}

// Type guard to check if validation failed
export function isValidationError<T>(
  result: ValidationResult<T>
): result is ValidationError {
  return !result.success;
}
