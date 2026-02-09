/**
 * Applications Table Component
 *
 * Reusable table component for displaying mortgage applications.
 * Features sorting, filtering, and loading states.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { MortgageApplication } from '@/types';
import { ApplicationStatus } from '@/types';

type SortField = 'applicationId' | 'borrowerName' | 'loanAmount' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface ApplicationsTableProps {
  applications: MortgageApplication[];
  isLoading: boolean;
  onStatusFilter?: (status: ApplicationStatus | undefined) => void;
  selectedStatus?: ApplicationStatus;
  showFilter?: boolean;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  [ApplicationStatus.DRAFT]: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
  [ApplicationStatus.SUBMITTED]: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700',
  },
  [ApplicationStatus.UNDER_REVIEW]: {
    label: 'Under Review',
    className: 'bg-yellow-100 text-yellow-700',
  },
  [ApplicationStatus.DOCUMENTS_REQUESTED]: {
    label: 'Docs Requested',
    className: 'bg-orange-100 text-orange-700',
  },
  [ApplicationStatus.APPROVED]: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700',
  },
  [ApplicationStatus.DENIED]: {
    label: 'Denied',
    className: 'bg-red-100 text-red-700',
  },
  [ApplicationStatus.WITHDRAWN]: {
    label: 'Withdrawn',
    className: 'bg-gray-200 text-gray-600',
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getShortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

function StatusBadge({ status }: { status: ApplicationStatus }): JSX.Element {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-100 py-4">
          <div className="h-4 w-20 rounded bg-gray-200"></div>
          <div className="h-4 w-32 rounded bg-gray-200"></div>
          <div className="h-4 w-24 rounded bg-gray-200"></div>
          <div className="h-6 w-20 rounded-full bg-gray-200"></div>
          <div className="h-4 w-24 rounded bg-gray-200"></div>
          <div className="h-4 w-16 rounded bg-gray-200"></div>
        </div>
      ))}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg
          className="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">No applications found</h3>
      <p className="mb-4 text-gray-600">{`There are no applications matching your criteria.`}</p>
      <Link to="/applications/new" className="btn btn-primary">
        Create New Application
      </Link>
    </div>
  );
}

function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}): JSX.Element {
  if (field !== currentField) {
    return (
      <svg
        className="ml-1 h-4 w-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  return (
    <svg
      className="ml-1 h-4 w-4 text-brand-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
  );
}

export function ApplicationsTable({
  applications,
  isLoading,
  onStatusFilter,
  selectedStatus,
  showFilter = true,
}: ApplicationsTableProps): JSX.Element {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'applicationId':
          comparison = a.applicationId.localeCompare(b.applicationId);
          break;
        case 'borrowerName': {
          const nameA = `${a.borrowerInfo.firstName} ${a.borrowerInfo.lastName}`;
          const nameB = `${b.borrowerInfo.firstName} ${b.borrowerInfo.lastName}`;
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'loanAmount':
          comparison = a.propertyInfo.loanAmount - b.propertyInfo.loanAmount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [applications, sortField, sortDirection]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    onStatusFilter?.(value === '' ? undefined : (value as ApplicationStatus));
  };

  return (
    <div className="card overflow-hidden">
      {/* Header with filter */}
      {showFilter && (
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm text-gray-600">
              Filter by status:
            </label>
            <select
              id="statusFilter"
              className="input w-40"
              value={selectedStatus ?? ''}
              onChange={handleStatusChange}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Empty state */}
      {!isLoading && applications.length === 0 && <EmptyState />}

      {/* Table */}
      {!isLoading && applications.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3 pr-4">
                  <button
                    onClick={() => handleSort('applicationId')}
                    className="flex items-center hover:text-gray-700"
                  >
                    ID
                    <SortIcon
                      field="applicationId"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th className="pb-3 pr-4">
                  <button
                    onClick={() => handleSort('borrowerName')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Borrower
                    <SortIcon
                      field="borrowerName"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th className="pb-3 pr-4">
                  <button
                    onClick={() => handleSort('loanAmount')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Amount
                    <SortIcon
                      field="loanAmount"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th className="pb-3 pr-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Status
                    <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                  </button>
                </th>
                <th className="pb-3 pr-4">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Date
                    <SortIcon
                      field="createdAt"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </button>
                </th>
                <th className="pb-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedApplications.map((app) => (
                <tr key={app.applicationId} className="group transition-colors hover:bg-gray-50">
                  <td className="py-4 pr-4">
                    <span className="font-mono text-sm text-gray-600">
                      {getShortId(app.applicationId)}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {app.borrowerInfo.firstName} {app.borrowerInfo.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{app.borrowerInfo.email}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(app.propertyInfo.loanAmount)}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-4 pr-4">
                    <span className="text-sm text-gray-600">{formatDate(app.createdAt)}</span>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <Link
                      to={`/applications/${app.applicationId}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 transition-opacity hover:text-brand-700 group-hover:opacity-100"
                    >
                      View
                      <svg
                        className="h-4 w-4"
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
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { StatusBadge, STATUS_CONFIG };
