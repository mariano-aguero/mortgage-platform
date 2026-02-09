import type { APIGatewayProxyHandler } from 'aws-lambda';
import { getApplication as fetchApplication } from '../../services/dynamoService';
import { success, error } from '@utils/response';
import { extractUser, hasElevatedRole } from '@utils/auth';
import * as logger from '../../utils/logger';

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext.requestId;

  try {
    const user = extractUser(event);

    if (!user) {
      logger.warn('Unauthorized request - no user found', { requestId });
      return error('Unauthorized', 401);
    }

    const applicationId = event.pathParameters?.['applicationId'];

    if (applicationId === undefined || applicationId === '') {
      return error('applicationId is required', 400);
    }

    logger.info('Fetching application', { requestId, applicationId, userId: user.userId });

    const application = await fetchApplication(applicationId);

    if (!application) {
      logger.warn('Application not found', { requestId, applicationId });
      return error('Application not found', 404);
    }

    const isOwner = application.userId === user.userId;
    const canAccess = isOwner || hasElevatedRole(user);

    if (!canAccess) {
      logger.warn('Access denied', {
        requestId,
        applicationId,
        userId: user.userId,
        ownerId: application.userId,
      });
      return error('Access denied', 403);
    }

    logger.info('Application retrieved', { requestId, applicationId });

    return success(application);
  } catch (err) {
    logger.error('Error fetching application', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return error('Internal server error', 500);
  }
};
