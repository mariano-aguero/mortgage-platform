/**
 * Application Status Enum
 * Represents all possible states of a mortgage application
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

/**
 * Valid status transitions map
 * Defines which statuses can transition to which other statuses
 */
export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.DOCUMENTS_REQUESTED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.DENIED,
  ],
  [ApplicationStatus.DOCUMENTS_REQUESTED]: [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.APPROVED]: [ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.DENIED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

/**
 * Borrower Information
 */
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

/**
 * Property Information
 */
export interface PropertyInfo {
  address: string;
  type: string;
  estimatedValue: number;
  loanAmount: number;
  loanType: string;
  downPaymentPercentage: number;
}

/**
 * Mortgage Application
 */
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

/**
 * Status History Entry
 */
export interface StatusHistoryEntry {
  status: ApplicationStatus;
  timestamp: string;
  changedBy: string;
  notes?: string;
}

/**
 * Standard API Response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Paginated List Response
 */
export interface ListApplicationsResponse {
  items: MortgageApplication[];
  lastKey?: string;
  count: number;
}

/**
 * Create Application Input
 */
export interface CreateApplicationInput {
  borrowerInfo: BorrowerInfo;
  propertyInfo: PropertyInfo;
  notes?: string;
}

/**
 * Update Status Input
 */
export interface UpdateStatusInput {
  status: ApplicationStatus;
  notes?: string;
}

/**
 * Authenticated User
 */
export interface AuthUser {
  userId: string;
  email: string;
  groups: string[];
}

/**
 * Sign In Input
 */
export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Sign Up Input
 */
export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * User Roles
 */
export enum UserRole {
  BORROWER = 'borrower',
  LOAN_OFFICER = 'loan_officer',
  ADMIN = 'admin',
}

/**
 * Property Types
 */
export const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Manufactured',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * Loan Types
 */
export const LOAN_TYPES = ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo'] as const;

export type LoanType = (typeof LOAN_TYPES)[number];

/**
 * Employment Status Options
 */
export const EMPLOYMENT_STATUSES = [
  'Employed',
  'Self-Employed',
  'Retired',
  'Unemployed',
  'Student',
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
