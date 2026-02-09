/**
 * Dashboard Page
 *
 * Main dashboard with summary cards and recent applications table.
 * Provides overview of mortgage application portfolio.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApplications } from '@/hooks/useApplications';
import { ApplicationsTable } from '@/components/ApplicationsTable';
import { ApplicationStatus } from '@/types';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: JSX.Element;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function SummaryCard({ title, value, icon, trend, className = '' }: SummaryCardProps): JSX.Element {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && (
            <p
              className={`mt-2 flex items-center text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <svg
                className={`mr-1 h-4 w-4 ${trend.isPositive ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              {trend.value}% from last month
            </p>
          )}
        </div>
        <div className="rounded-lg bg-brand-50 p-3 text-brand-600">{icon}</div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

function DashboardPage(): JSX.Element {
  const { applications, isLoading, error, fetchApplications } = useApplications();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>(undefined);

  useEffect(() => {
    void fetchApplications(statusFilter);
  }, [fetchApplications, statusFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((app) => app.status === ApplicationStatus.SUBMITTED).length;
    const approved = applications.filter((app) => app.status === ApplicationStatus.APPROVED).length;
    const totalAmount = applications.reduce((sum, app) => sum + app.propertyInfo.loanAmount, 0);

    return { total, pending, approved, totalAmount };
  }, [applications]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Overview of your mortgage applications</p>
        </div>
        <Link to="/applications/new" className="btn btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Application
        </Link>
      </div>

      {/* Error message */}
      {error !== null && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Applications"
          value={stats.total}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <SummaryCard
          title="Pending Review"
          value={stats.pending}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <SummaryCard
          title="Approved"
          value={stats.approved}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <SummaryCard
          title="Total Requested"
          value={formatCurrency(stats.totalAmount)}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Applications Table */}
      <ApplicationsTable
        applications={applications}
        isLoading={isLoading}
        onStatusFilter={setStatusFilter}
        selectedStatus={statusFilter}
        showFilter={true}
      />
    </div>
  );
}

export default DashboardPage;
