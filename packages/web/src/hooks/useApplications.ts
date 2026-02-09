/**
 * useApplications Hook
 *
 * Custom hook for managing mortgage applications.
 * Provides CRUD operations with loading and error states.
 */

import { useState, useCallback } from 'react';
import type {
  MortgageApplication,
  CreateApplicationInput,
  ApplicationStatus,
  UpdateStatusInput,
} from '@/types';
import {
  listApplications as apiListApplications,
  createApplication as apiCreateApplication,
  updateApplicationStatus as apiUpdateStatus,
} from '@/services/api';

export interface UseApplicationsState {
  applications: MortgageApplication[];
  isLoading: boolean;
  error: string | null;
}

export interface UseApplicationsActions {
  fetchApplications: (status?: ApplicationStatus) => Promise<void>;
  createApplication: (data: CreateApplicationInput) => Promise<MortgageApplication | null>;
  updateStatus: (
    applicationId: string,
    newStatus: ApplicationStatus,
    notes?: string,
  ) => Promise<MortgageApplication | null>;
  clearError: () => void;
}

export type UseApplicationsReturn = UseApplicationsState & UseApplicationsActions;

export function useApplications(): UseApplicationsReturn {
  const [applications, setApplications] = useState<MortgageApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (status?: ApplicationStatus): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiListApplications(status !== undefined ? { status } : undefined);

      if (result.success && result.data !== undefined) {
        setApplications(result.data.items);
      } else {
        setError(result.error?.message ?? 'Failed to fetch applications');
        setApplications([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createApplication = useCallback(
    async (data: CreateApplicationInput): Promise<MortgageApplication | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiCreateApplication(data);

        if (result.success && result.data !== undefined) {
          const newApplication = result.data;
          setApplications((prev) => [newApplication, ...prev]);
          return newApplication;
        } else {
          setError(result.error?.message ?? 'Failed to create application');
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateStatus = useCallback(
    async (
      applicationId: string,
      newStatus: ApplicationStatus,
      notes?: string,
    ): Promise<MortgageApplication | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const input: UpdateStatusInput = { status: newStatus };
        if (notes !== undefined) {
          input.notes = notes;
        }

        const result = await apiUpdateStatus(applicationId, input);

        if (result.success && result.data !== undefined) {
          const updatedApplication = result.data;
          setApplications((prev) =>
            prev.map((app) => (app.applicationId === applicationId ? updatedApplication : app)),
          );
          return updatedApplication;
        } else {
          setError(result.error?.message ?? 'Failed to update application status');
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    applications,
    isLoading,
    error,
    fetchApplications,
    createApplication,
    updateStatus,
    clearError,
  };
}
