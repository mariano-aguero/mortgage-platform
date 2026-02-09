import type { APIGatewayProxyHandler } from 'aws-lambda';
import { MortgageApplicationSchema } from '@models/mortgage.schema';
import type { ApiResponse } from '../types';

export const create: APIGatewayProxyHandler = async (event) => {
  try {
    const body: unknown = event.body !== null ? JSON.parse(event.body) : {};

    // Zod validation
    const validationResult = MortgageApplicationSchema.safeParse(body);

    if (!validationResult.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Validation failed',
          details: validationResult.error.format(),
        },
      };

      return {
        statusCode: 400,
        body: JSON.stringify(response),
      };
    }

    // Business/service logic would go here

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Application created successfully',
        application: validationResult.data,
      },
    };

    return {
      statusCode: 201,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error creating application:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Internal server error',
      },
    };

    return {
      statusCode: 500,
      body: JSON.stringify(response),
    };
  }
};
