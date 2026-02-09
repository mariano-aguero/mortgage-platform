/**
 * API Configuration
 *
 * Base URL and endpoint configuration for the API Gateway.
 * Supports both AWS and LocalStack environments.
 */

import { getEnvVar, isLocalStackEnabled, getLocalStackEndpoint } from './amplify';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export function getApiConfig(): ApiConfig {
  const isLocalStack = isLocalStackEnabled();

  let baseUrl: string;

  if (isLocalStack) {
    // LocalStack uses the same endpoint or serverless-offline
    baseUrl = getLocalStackEndpoint();
  } else {
    baseUrl = getEnvVar('VITE_API_URL');
  }

  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/+$/, '');

  return {
    baseUrl,
    timeout: 30000, // 30 seconds
  };
}

export const API_ENDPOINTS = {
  applications: '/applications',
  application: (id: string): string => `/applications/${id}`,
  applicationStatus: (id: string): string => `/applications/${id}/status`,
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
