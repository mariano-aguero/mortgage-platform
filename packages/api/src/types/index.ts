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
