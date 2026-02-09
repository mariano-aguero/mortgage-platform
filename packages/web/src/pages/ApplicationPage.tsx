/**
 * Application Detail Page
 *
 * Displays detailed view of a mortgage application with:
 * - Header with status badge and dates
 * - Borrower and Property information
 * - Loan Summary with calculations
 * - Status History timeline
 * - Role-based actions for loan officers
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getApplication, updateApplicationStatus } from '@/services/api';
import { useAuthContext } from '@/context/AuthContext';
import type { MortgageApplication } from '@/types';
import { ApplicationStatus } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface StatusHistoryEntry {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  timestamp: string;
  notes?: string;
  actor?: string;
}

interface StatusTransition {
  targetStatus: ApplicationStatus;
  label: string;
  buttonStyle: string;
  description: string;
}

interface ActionModalState {
  isOpen: boolean;
  transition: StatusTransition | null;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  [ApplicationStatus.DRAFT]: {
    label: 'Draft',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '📝',
  },
  [ApplicationStatus.SUBMITTED]: {
    label: 'Submitted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '📨',
  },
  [ApplicationStatus.UNDER_REVIEW]: {
    label: 'Under Review',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '🔍',
  },
  [ApplicationStatus.DOCUMENTS_REQUESTED]: {
    label: 'Documents Requested',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '📄',
  },
  [ApplicationStatus.APPROVED]: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '✅',
  },
  [ApplicationStatus.DENIED]: {
    label: 'Denied',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '❌',
  },
  [ApplicationStatus.WITHDRAWN]: {
    label: 'Withdrawn',
    color: 'text-gray-600',
    bgColor: 'bg-gray-200',
    icon: '↩️',
  },
};

const VALID_TRANSITIONS: Record<ApplicationStatus, StatusTransition[]> = {
  [ApplicationStatus.DRAFT]: [
    {
      targetStatus: ApplicationStatus.SUBMITTED,
      label: 'Submit Application',
      buttonStyle: 'btn-primary',
      description: 'Submit this application for review',
    },
  ],
  [ApplicationStatus.SUBMITTED]: [
    {
      targetStatus: ApplicationStatus.UNDER_REVIEW,
      label: 'Start Review',
      buttonStyle: 'btn-primary',
      description: 'Begin reviewing this application',
    },
    {
      targetStatus: ApplicationStatus.DOCUMENTS_REQUESTED,
      label: 'Request Documents',
      buttonStyle: 'bg-orange-600 text-white hover:bg-orange-700',
      description: 'Request additional documents from the applicant',
    },
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    {
      targetStatus: ApplicationStatus.APPROVED,
      label: 'Approve',
      buttonStyle: 'bg-green-600 text-white hover:bg-green-700',
      description: 'Approve this mortgage application',
    },
    {
      targetStatus: ApplicationStatus.DENIED,
      label: 'Deny',
      buttonStyle: 'bg-red-600 text-white hover:bg-red-700',
      description: 'Deny this mortgage application',
    },
    {
      targetStatus: ApplicationStatus.DOCUMENTS_REQUESTED,
      label: 'Request Documents',
      buttonStyle: 'bg-orange-600 text-white hover:bg-orange-700',
      description: 'Request additional documents from the applicant',
    },
  ],
  [ApplicationStatus.DOCUMENTS_REQUESTED]: [
    {
      targetStatus: ApplicationStatus.UNDER_REVIEW,
      label: 'Resume Review',
      buttonStyle: 'btn-primary',
      description: 'Documents received, continue review',
    },
  ],
  [ApplicationStatus.APPROVED]: [],
  [ApplicationStatus.DENIED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

const LOAN_OFFICER_GROUPS = ['loan_officer', 'admin', 'LoanOfficers', 'Admins'];

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateMonthlyPayment(
  loanAmount: number,
  downPaymentPercentage: number,
  annualRate: number = 0.07,
  years: number = 30,
): number {
  const principal = loanAmount * (1 - downPaymentPercentage / 100);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;

  if (principal <= 0 || monthlyRate <= 0) return 0;

  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return Math.round(payment);
}

function calculateLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return Math.round((loanAmount / propertyValue) * 100);
}

function getShortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

function generateStatusHistory(application: MortgageApplication): StatusHistoryEntry[] {
  const history: StatusHistoryEntry[] = [];

  // Initial creation
  history.push({
    id: '1',
    fromStatus: null,
    toStatus: ApplicationStatus.DRAFT,
    timestamp: application.createdAt,
    notes: 'Application created',
  });

  // If status changed from draft
  if (application.status !== ApplicationStatus.DRAFT) {
    // Simulate intermediate statuses based on current status
    const statusOrder: ApplicationStatus[] = [
      ApplicationStatus.DRAFT,
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.DOCUMENTS_REQUESTED,
      ApplicationStatus.APPROVED,
    ];

    const currentIndex = statusOrder.indexOf(application.status);
    if (currentIndex === -1) {
      // Handle DENIED or WITHDRAWN
      if (application.status === ApplicationStatus.DENIED) {
        history.push({
          id: '2',
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.SUBMITTED,
          timestamp: application.createdAt,
        });
        history.push({
          id: '3',
          fromStatus: ApplicationStatus.SUBMITTED,
          toStatus: ApplicationStatus.UNDER_REVIEW,
          timestamp: application.updatedAt,
        });
        history.push({
          id: '4',
          fromStatus: ApplicationStatus.UNDER_REVIEW,
          toStatus: ApplicationStatus.DENIED,
          timestamp: application.updatedAt,
          notes: application.notes,
        });
      } else if (application.status === ApplicationStatus.WITHDRAWN) {
        history.push({
          id: '2',
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.WITHDRAWN,
          timestamp: application.updatedAt,
          notes: 'Application withdrawn by applicant',
        });
      }
    } else {
      // Add transitions up to current status
      for (let i = 1; i <= currentIndex; i++) {
        const prevStatus = statusOrder[i - 1];
        const nextStatus = statusOrder[i];
        if (prevStatus !== undefined && nextStatus !== undefined) {
          history.push({
            id: String(i + 1),
            fromStatus: prevStatus,
            toStatus: nextStatus,
            timestamp: i === currentIndex ? application.updatedAt : application.createdAt,
            notes: i === currentIndex ? application.notes : undefined,
          });
        }
      }
    }
  }

  return history.reverse(); // Most recent first
}

function isLoanOfficer(groups: string[]): boolean {
  return groups.some((g) => LOAN_OFFICER_GROUPS.includes(g));
}

// ============================================================================
// Components
// ============================================================================

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse p-6 lg:p-8">
      <div className="mb-6 h-4 w-32 rounded bg-gray-200" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-48 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-32 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-6">
        <div className="card">
          <div className="mb-4 h-6 w-48 rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="mb-1 h-4 w-20 rounded bg-gray-200" />
                <div className="h-5 w-32 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="mb-4 h-6 w-48 rounded bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="mb-1 h-4 w-20 rounded bg-gray-200" />
                <div className="h-5 w-32 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundState(): JSX.Element {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <span className="text-4xl">🔍</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Application Not Found</h1>
        <p className="mt-2 text-gray-600">
          The application you&apos;re looking for doesn&apos;t exist or you don&apos;t have
          permission to view it.
        </p>
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'lg';
}

function StatusBadge({ status, size = 'sm' }: StatusBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status];
  const sizeClasses = size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

interface InfoItemProps {
  label: string;
  value: string | number;
  className?: string;
}

function InfoItem({ label, value, className = '' }: InfoItemProps): JSX.Element {
  return (
    <div className={className}>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

interface LoanSummaryCardProps {
  loanAmount: number;
  downPaymentPercentage: number;
  estimatedValue: number;
}

function LoanSummaryCard({
  loanAmount,
  downPaymentPercentage,
  estimatedValue,
}: LoanSummaryCardProps): JSX.Element {
  const monthlyPayment = calculateMonthlyPayment(loanAmount, downPaymentPercentage);
  const ltvRatio = calculateLTV(loanAmount, estimatedValue);
  const downPaymentAmount = (loanAmount * downPaymentPercentage) / 100;

  return (
    <div className="card border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Loan Summary</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Loan Amount</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(loanAmount)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Down Payment ({downPaymentPercentage}%)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(downPaymentAmount)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Est. Monthly Payment</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">{formatCurrency(monthlyPayment)}</p>
          <p className="text-xs text-gray-400">7% APR, 30-year fixed</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">LTV Ratio</p>
          <p
            className={`mt-1 text-2xl font-bold ${ltvRatio > 80 ? 'text-orange-600' : 'text-green-600'}`}
          >
            {ltvRatio}%
          </p>
          <p className="text-xs text-gray-400">
            {ltvRatio > 80 ? 'PMI may apply' : 'No PMI required'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

function StatusTimeline({ history }: StatusTimelineProps): JSX.Element {
  return (
    <div className="card">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Status History</h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {history.map((entry, index) => {
            const config = STATUS_CONFIG[entry.toStatus];
            const isFirst = index === 0;

            return (
              <div key={entry.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    isFirst ? 'ring-4 ring-brand-100' : ''
                  } ${config.bgColor}`}
                >
                  <span className="text-sm">{config.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.fromStatus !== null && (
                      <>
                        <span className="text-sm text-gray-500">
                          {STATUS_CONFIG[entry.fromStatus].label}
                        </span>
                        <svg
                          className="h-4 w-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{formatDateTime(entry.timestamp)}</p>
                  {entry.notes !== undefined && entry.notes !== '' && (
                    <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600 italic">
                      &quot;{entry.notes}&quot;
                    </p>
                  )}
                  {entry.actor !== undefined && (
                    <p className="mt-1 text-xs text-gray-400">by {entry.actor}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ActionModalProps {
  isOpen: boolean;
  transition: StatusTransition | null;
  isSubmitting: boolean;
  onConfirm: (notes: string) => void;
  onClose: () => void;
}

function ActionModal({
  isOpen,
  transition,
  isSubmitting,
  onConfirm,
  onClose,
}: ActionModalProps): JSX.Element | null {
  const [notes, setNotes] = useState('');

  if (!isOpen || transition === null) return null;

  const handleConfirm = (): void => {
    onConfirm(notes);
    setNotes('');
  };

  const handleClose = (): void => {
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
        <p className="mt-2 text-gray-600">{transition.description}</p>

        <div className="mt-4">
          <label htmlFor="actionNotes" className="block text-sm font-medium text-gray-700">
            Notes (optional)
          </label>
          <textarea
            id="actionNotes"
            rows={3}
            className="input mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any relevant notes..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`btn ${transition.buttonStyle}`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              transition.label
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function ApplicationPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const [application, setApplication] = useState<MortgageApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ActionModalState>({ isOpen: false, transition: null });

  const userIsLoanOfficer = useMemo(() => {
    return user !== null && isLoanOfficer(user.groups);
  }, [user]);

  const statusHistory = useMemo(() => {
    if (application === null) return [];
    return generateStatusHistory(application);
  }, [application]);

  const availableTransitions = useMemo(() => {
    if (application === null) return [];
    return VALID_TRANSITIONS[application.status];
  }, [application]);

  const canWithdraw = useMemo(() => {
    if (application === null) return false;
    return [
      ApplicationStatus.DRAFT,
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.DOCUMENTS_REQUESTED,
    ].includes(application.status);
  }, [application]);

  useEffect(() => {
    async function loadApplication(): Promise<void> {
      if (id === undefined) {
        setError('Application ID is required');
        setIsLoading(false);
        return;
      }

      const result = await getApplication(id);

      if (result.success && result.data !== undefined) {
        setApplication(result.data);
      } else {
        setError(result.error?.message ?? 'Failed to load application');
      }

      setIsLoading(false);
    }

    void loadApplication();
  }, [id]);

  const handleStatusChange = useCallback(
    async (targetStatus: ApplicationStatus, notes?: string): Promise<void> => {
      if (application === null || id === undefined) return;

      setIsSubmitting(true);
      setError(null);

      const result = await updateApplicationStatus(id, {
        status: targetStatus,
        notes: notes !== '' ? notes : undefined,
      });

      if (result.success && result.data !== undefined) {
        setApplication(result.data);
        setModal({ isOpen: false, transition: null });
      } else {
        setError(result.error?.message ?? 'Failed to update status');
      }

      setIsSubmitting(false);
    },
    [application, id],
  );

  const handleWithdraw = useCallback(async (): Promise<void> => {
    await handleStatusChange(ApplicationStatus.WITHDRAWN, 'Application withdrawn by applicant');
  }, [handleStatusChange]);

  const openActionModal = useCallback((transition: StatusTransition): void => {
    setModal({ isOpen: true, transition });
  }, []);

  const closeActionModal = useCallback((): void => {
    setModal({ isOpen: false, transition: null });
  }, []);

  const confirmAction = useCallback(
    (notes: string): void => {
      if (modal.transition !== null) {
        void handleStatusChange(modal.transition.targetStatus, notes);
      }
    },
    [modal.transition, handleStatusChange],
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (application === null) {
    return <NotFoundState />;
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Action Modal */}
      <ActionModal
        isOpen={modal.isOpen}
        transition={modal.transition}
        isSubmitting={isSubmitting}
        onConfirm={confirmAction}
        onClose={closeActionModal}
      />

      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-900">
          Application #{getShortId(application.applicationId)}
        </span>
      </nav>

      {/* Error message */}
      {error !== null && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Application #{getShortId(application.applicationId)}
          </h1>
          <p className="mt-1 text-gray-500">Submitted on {formatDate(application.createdAt)}</p>
        </div>
        <StatusBadge status={application.status} size="lg" />
      </div>

      <div className="space-y-6">
        {/* Loan Summary Card */}
        <LoanSummaryCard
          loanAmount={application.propertyInfo.loanAmount}
          downPaymentPercentage={application.propertyInfo.downPaymentPercentage}
          estimatedValue={application.propertyInfo.estimatedValue}
        />

        {/* Borrower Information */}
        <div className="card">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Borrower Information</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Full Name"
              value={`${application.borrowerInfo.firstName} ${application.borrowerInfo.lastName}`}
            />
            <InfoItem label="Email" value={application.borrowerInfo.email} />
            <InfoItem label="Phone" value={application.borrowerInfo.phone} />
            <InfoItem label="SSN (Last 4)" value={`***-**-${application.borrowerInfo.ssnLast4}`} />
            <InfoItem
              label="Annual Income"
              value={formatCurrency(application.borrowerInfo.annualIncome)}
            />
            <InfoItem label="Employment Status" value={application.borrowerInfo.employmentStatus} />
            <InfoItem label="Employer" value={application.borrowerInfo.employer} />
          </dl>
        </div>

        {/* Property & Loan Details */}
        <div className="card">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Property & Loan Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Property Address"
              value={application.propertyInfo.address}
              className="sm:col-span-2 lg:col-span-3"
            />
            <InfoItem label="Property Type" value={application.propertyInfo.type} />
            <InfoItem
              label="Estimated Value"
              value={formatCurrency(application.propertyInfo.estimatedValue)}
            />
            <InfoItem label="Loan Type" value={application.propertyInfo.loanType} />
            <InfoItem
              label="Loan Amount"
              value={formatCurrency(application.propertyInfo.loanAmount)}
            />
            <InfoItem
              label="Down Payment"
              value={`${application.propertyInfo.downPaymentPercentage}%`}
            />
          </dl>
        </div>

        {/* Status History Timeline */}
        <StatusTimeline history={statusHistory} />

        {/* Notes */}
        {application.notes !== undefined && application.notes !== '' && (
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
            <p className="whitespace-pre-wrap text-gray-700">{application.notes}</p>
          </div>
        )}

        {/* Actions Section */}
        {(availableTransitions.length > 0 || canWithdraw) && (
          <div className="card border-t-4 border-t-brand-600">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {/* Loan Officer Actions */}
              {userIsLoanOfficer &&
                availableTransitions.map((transition) => (
                  <button
                    key={transition.targetStatus}
                    onClick={() => openActionModal(transition)}
                    disabled={isSubmitting}
                    className={`btn ${transition.buttonStyle}`}
                  >
                    {transition.label}
                  </button>
                ))}

              {/* User actions (submit draft, withdraw) */}
              {!userIsLoanOfficer && application.status === ApplicationStatus.DRAFT && (
                <button
                  onClick={() =>
                    openActionModal({
                      targetStatus: ApplicationStatus.SUBMITTED,
                      label: 'Submit Application',
                      buttonStyle: 'btn-primary',
                      description: 'Submit this application for review',
                    })
                  }
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  Submit Application
                </button>
              )}

              {canWithdraw && (
                <button
                  onClick={() => void handleWithdraw()}
                  disabled={isSubmitting}
                  className="btn btn-outline border-red-300 text-red-600 hover:bg-red-50"
                >
                  {isSubmitting ? 'Withdrawing...' : 'Withdraw Application'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="pt-4">
          <Link to="/dashboard" className="btn btn-outline">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ApplicationPage;
