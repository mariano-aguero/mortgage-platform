/**
 * Application Types
 *
 * These types are shared with the backend.
 * Keep in sync with backend/types/index.ts
 */

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DOCUMENTS_REQUESTED = 'DOCUMENTS_REQUESTED',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface BorrowerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssnLast4: string;
  annualIncome: number;
  employmentStatus: string;
  employer: string;
}

export interface PropertyInfo {
  address: string;
  type: string;
  estimatedValue: number;
  loanAmount: number;
  loanType: string;
  downPaymentPercentage: number;
}

export interface MortgageApplication {
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  borrowerInfo: BorrowerInfo;
  propertyInfo: PropertyInfo;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface ListApplicationsResponse {
  items: MortgageApplication[];
  lastKey?: string;
}

export interface CreateApplicationInput {
  borrowerInfo: BorrowerInfo;
  propertyInfo: PropertyInfo;
  notes?: string;
}

export interface UpdateStatusInput {
  status: ApplicationStatus;
  notes?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  groups: string[];
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
