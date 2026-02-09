import type { APIGatewayProxyResult } from 'aws-lambda';
import type { ApiResponse } from '../types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

export function success<T>(body: T, statusCode = 200): APIGatewayProxyResult {
  const response: ApiResponse<T> = {
    success: true,
    data: body,
  };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}

export function error(message: string, statusCode = 500, details?: unknown): APIGatewayProxyResult {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      details,
    },
  };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}
