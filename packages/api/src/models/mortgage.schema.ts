import { z } from 'zod';
import { ApplicationStatus } from '../types';

export const BorrowerInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  ssnLast4: z.string().length(4),
  annualIncome: z.number().positive(),
  employmentStatus: z.string(),
  employer: z.string(),
});

export const PropertyInfoSchema = z.object({
  address: z.string().min(5),
  type: z.string(),
  estimatedValue: z.number().positive(),
  loanAmount: z.number().positive(),
  loanType: z.string(),
  downPaymentPercentage: z.number().min(0).max(100),
});

export const MortgageApplicationSchema = z.object({
  applicationId: z.string().uuid().optional(),
  userId: z.string(),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.DRAFT),
  borrowerInfo: BorrowerInfoSchema,
  propertyInfo: PropertyInfoSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type MortgageApplicationInput = z.infer<typeof MortgageApplicationSchema>;
