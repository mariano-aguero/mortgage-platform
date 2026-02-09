// Types
import { ApplicationStatus, VALID_STATUS_TRANSITIONS } from './types';

export {
  ApplicationStatus,
  VALID_STATUS_TRANSITIONS,
  UserRole,
  PROPERTY_TYPES,
  LOAN_TYPES,
  EMPLOYMENT_STATUSES,
} from './types';

export type {
  BorrowerInfo,
  PropertyInfo,
  MortgageApplication,
  StatusHistoryEntry,
  ApiResponse,
  ListApplicationsResponse,
  CreateApplicationInput,
  UpdateStatusInput,
  AuthUser,
  SignInInput,
  SignUpInput,
  PropertyType,
  LoanType,
  EmploymentStatus,
} from './types';

// Schemas
export {
  BorrowerInfoSchema,
  PropertyInfoSchema,
  CreateApplicationSchema,
  UpdateStatusSchema,
  MortgageApplicationSchema,
  SignInSchema,
  SignUpSchema,
} from './schemas';

export type { BorrowerInfoInput, PropertyInfoInput, MortgageApplicationInput } from './schemas';

// Utility functions
export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

export function calculateMonthlyPayment(
  loanAmount: number,
  annualInterestRate: number,
  loanTermMonths: number,
): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate === 0) return loanAmount / loanTermMonths;

  const payment =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
    (Math.pow(1 + monthlyRate, loanTermMonths) - 1);

  return Math.round(payment * 100) / 100;
}

export function calculateLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return Math.round((loanAmount / propertyValue) * 100 * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
