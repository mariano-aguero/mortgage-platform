import type { APIGatewayProxyHandler } from 'aws-lambda';
import { z } from 'zod';
import {
  getApplication,
  updateApplicationStatus as updateStatus,
} from '../../services/dynamoService';
import { publishStatusChange } from '@services/eventBridgeService';
import { ApplicationStatus } from '../../types';
import { success, error } from '@utils/response';
import { extractUser, hasElevatedRole } from '@utils/auth';
import { validateStatusTransition } from '@utils/validators';
import * as logger from '../../utils/logger';

const updateStatusBodySchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
  notes: z.string().optional(),
});

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

    const body: unknown = event.body !== null ? JSON.parse(event.body) : {};
    const validation = updateStatusBodySchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Validation failed', {
        requestId,
        errors: validation.error.format(),
      });
      return error('Validation failed', 400, validation.error.format());
    }

    const { status: newStatus, notes } = validation.data;

    logger.info('Updating application status', {
      requestId,
      applicationId,
      newStatus,
      userId: user.userId,
    });

    const application = await getApplication(applicationId);

    if (!application) {
      logger.warn('Application not found', { requestId, applicationId });
      return error('Application not found', 404);
    }

    const isOwner = application.userId === user.userId;
    const canUpdate = isOwner || hasElevatedRole(user);

    if (!canUpdate) {
      logger.warn('Access denied for status update', {
        requestId,
        applicationId,
        userId: user.userId,
      });
      return error('Access denied', 403);
    }

    const previousStatus = application.status;

    if (!validateStatusTransition(previousStatus, newStatus)) {
      logger.warn('Invalid status transition', {
        requestId,
        applicationId,
        previousStatus,
        newStatus,
      });
      return error(`Invalid status transition from ${previousStatus} to ${newStatus}`, 400);
    }

    const updated = await updateStatus(applicationId, previousStatus, newStatus, notes);

    if (!updated) {
      logger.error('Failed to update application', { requestId, applicationId });
      return error('Failed to update application', 500);
    }

    await publishStatusChange(applicationId, previousStatus, newStatus, application.userId);

    logger.info('Application status updated', {
      requestId,
      applicationId,
      previousStatus,
      newStatus,
    });

    return success(updated);
  } catch (err) {
    logger.error('Error updating application status', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return error('Internal server error', 500);
  }
};
