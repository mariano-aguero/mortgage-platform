import type { APIGatewayProxyHandler } from 'aws-lambda';
import { listApplicationsByUser, listApplicationsByStatus } from '@services/dynamoService';
import { ApplicationStatus } from '../../types';
import type { MortgageApplication } from '../../types';
import { success, error } from '@utils/response';
import { extractUser, hasElevatedRole } from '@utils/auth';
import * as logger from '../../utils/logger';

interface ListResponse {
  items: MortgageApplication[];
  lastKey?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext.requestId;

  try {
    const user = extractUser(event);

    if (!user) {
      logger.warn('Unauthorized request - no user found', { requestId });
      return error('Unauthorized', 401);
    }

    const statusFilter = event.queryStringParameters?.['status'];
    const limitParam = event.queryStringParameters?.['limit'];
    const limit =
      limitParam !== undefined && limitParam !== '' ? parseInt(limitParam, 10) : undefined;

    logger.info('Listing applications', {
      requestId,
      userId: user.userId,
      role: user.role,
      statusFilter,
    });

    let items: MortgageApplication[];

    if (hasElevatedRole(user) && statusFilter !== undefined && statusFilter !== '') {
      if (!Object.values(ApplicationStatus).includes(statusFilter as ApplicationStatus)) {
        return error('Invalid status filter', 400);
      }
      items = await listApplicationsByStatus(statusFilter as ApplicationStatus, limit);
    } else if (hasElevatedRole(user)) {
      items = await listApplicationsByStatus(ApplicationStatus.SUBMITTED, limit);
    } else {
      items = await listApplicationsByUser(user.userId);
    }

    const response: ListResponse = { items };

    logger.info('Applications listed', {
      requestId,
      count: items.length,
    });

    return success(response);
  } catch (err) {
    logger.error('Error listing applications', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return error('Internal server error', 500);
  }
};
