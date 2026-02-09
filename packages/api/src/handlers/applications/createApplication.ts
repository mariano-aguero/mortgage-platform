import type { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { createApplication as saveApplication } from '../../services/dynamoService';
import { ApplicationStatus } from '../../types';
import type { MortgageApplication } from '../../types';
import { success, error } from '@utils/response';
import { extractUser } from '@utils/auth';
import { createApplicationSchema } from '@utils/validators';
import * as logger from '../../utils/logger';

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext.requestId;

  try {
    const user = extractUser(event);

    if (!user) {
      logger.warn('Unauthorized request - no user found', { requestId });
      return error('Unauthorized', 401);
    }

    logger.info('Creating application', { requestId, userId: user.userId });

    const body: unknown = event.body !== null ? JSON.parse(event.body) : {};
    const validation = createApplicationSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Validation failed', {
        requestId,
        errors: validation.error.format(),
      });
      return error('Validation failed', 400, validation.error.format());
    }

    const now = new Date().toISOString();
    const application: MortgageApplication = {
      applicationId: uuidv4(),
      userId: user.userId,
      status: ApplicationStatus.DRAFT,
      borrowerInfo: validation.data.borrowerInfo,
      propertyInfo: validation.data.propertyInfo,
      createdAt: now,
      updatedAt: now,
      notes: validation.data.notes,
    };

    const saved = await saveApplication(application);

    logger.info('Application created', {
      requestId,
      applicationId: saved.applicationId,
      userId: user.userId,
    });

    return success(saved, 201);
  } catch (err) {
    logger.error('Error creating application', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return error('Internal server error', 500);
  }
};
