import { z } from 'zod';
import {
  ApplicationStatus,
  PROPERTY_TYPES,
  LOAN_TYPES,
  EMPLOYMENT_STATUSES,
} from './types';

/**
 * Borrower Information Schema
 */
export const BorrowerInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 characters')
    .regex(/^[\d\s\-()]+$/, 'Invalid phone number format'),
  ssnLast4: z
    .string()
    .length(4, 'SSN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'SSN must contain only digits'),
  annualIncome: z
    .number()
    .positive('Annual income must be positive')
    .max(100_000_000, 'Annual income seems too high'),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES, {
    errorMap: () => ({ message: 'Invalid employment status' }),
  }),
  employer: z
    .string()
    .min(1, 'Employer is required')
    .max(100, 'Employer name must be 100 characters or less'),
});

/**
 * Property Information Schema
 */
export const PropertyInfoSchema = z.object({
  address: z
    .string()
    .min(5, 'Address is required')
    .max(200, 'Address must be 200 characters or less'),
  type: z.enum(PROPERTY_TYPES, {
    errorMap: () => ({ message: 'Invalid property type' }),
  }),
  estimatedValue: z
    .number()
    .positive('Estimated value must be positive')
    .max(100_000_000, 'Estimated value seems too high'),
  loanAmount: z
    .number()
    .positive('Loan amount must be positive')
    .max(100_000_000, 'Loan amount seems too high'),
  loanType: z.enum(LOAN_TYPES, {
    errorMap: () => ({ message: 'Invalid loan type' }),
  }),
  downPaymentPercentage: z
    .number()
    .min(0, 'Down payment cannot be negative')
    .max(100, 'Down payment cannot exceed 100%'),
});

/**
 * Create Application Schema
 */
export const CreateApplicationSchema = z.object({
  borrowerInfo: BorrowerInfoSchema,
  propertyInfo: PropertyInfoSchema,
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

/**
 * Update Status Schema
 */
export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus, {
    errorMap: () => ({ message: 'Invalid application status' }),
  }),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

/**
 * Full Mortgage Application Schema (for database)
 */
export const MortgageApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  userId: z.string().min(1),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.DRAFT),
  borrowerInfo: BorrowerInfoSchema,
  propertyInfo: PropertyInfoSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  notes: z.string().optional(),
});

/**
 * Sign In Schema
 */
export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Sign Up Schema
 */
export const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

/**
 * Inferred Types from Schemas
 */
export type BorrowerInfoInput = z.infer<typeof BorrowerInfoSchema>;
export type PropertyInfoInput = z.infer<typeof PropertyInfoSchema>;
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type MortgageApplicationInput = z.infer<typeof MortgageApplicationSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
