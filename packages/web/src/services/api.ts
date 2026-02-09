/**
 * API Service
 *
 * Axios instance with JWT interceptor for authenticated API calls.
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getApiConfig, API_ENDPOINTS } from '@/config/api';
import { getIdToken } from './auth';
import type {
  ApiResponse,
  MortgageApplication,
  ListApplicationsResponse,
  CreateApplicationInput,
  UpdateStatusInput,
  ApplicationStatus,
} from '@/types';

const config = getApiConfig();

/**
 * Axios instance configured with base URL and interceptors
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: config.baseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add JWT token to Authorization header
 */
apiClient.interceptors.request.use(
  async (requestConfig: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const token = await getIdToken();

    if (token !== null) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    return requestConfig;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could trigger a re-login flow
      console.warn('Unauthorized request - token may be expired');
    }

    return Promise.reject(error);
  },
);

/**
 * Type guard to check if response is successful
 */
function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Create a new mortgage application
 */
export async function createApplication(
  input: CreateApplicationInput,
): Promise<ApiResponse<MortgageApplication>> {
  try {
    const response = await apiClient.post<ApiResponse<MortgageApplication>>(
      API_ENDPOINTS.applications,
      input,
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get a mortgage application by ID
 */
export async function getApplication(
  applicationId: string,
): Promise<ApiResponse<MortgageApplication>> {
  try {
    const response = await apiClient.get<ApiResponse<MortgageApplication>>(
      API_ENDPOINTS.application(applicationId),
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * List all mortgage applications
 */
export async function listApplications(params?: {
  status?: ApplicationStatus;
  limit?: number;
}): Promise<ApiResponse<ListApplicationsResponse>> {
  try {
    const response = await apiClient.get<ApiResponse<ListApplicationsResponse>>(
      API_ENDPOINTS.applications,
      { params },
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Update the status of a mortgage application
 */
export async function updateApplicationStatus(
  applicationId: string,
  input: UpdateStatusInput,
): Promise<ApiResponse<MortgageApplication>> {
  try {
    const response = await apiClient.patch<ApiResponse<MortgageApplication>>(
      API_ENDPOINTS.applicationStatus(applicationId),
      input,
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handle API errors and convert to ApiResponse format
 */
function handleApiError(error: unknown): ApiResponse<never> {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>;

    if (axiosError.response?.data?.error !== undefined) {
      return {
        success: false,
        error: axiosError.response.data.error,
      };
    }

    return {
      success: false,
      error: {
        message: axiosError.message,
        code: axiosError.code,
      },
    };
  }

  return {
    success: false,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    },
  };
}

export { apiClient, isSuccessResponse };
