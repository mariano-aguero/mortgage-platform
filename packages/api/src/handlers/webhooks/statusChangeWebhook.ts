import type { APIGatewayProxyHandler } from 'aws-lambda';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getApplication, updateApplicationStatus } from '@services/dynamoService';
import { ApplicationStatus } from '../../types';
import { success, error } from '@utils/response';
import * as logger from '../../utils/logger';

const WEBHOOK_SECRET = process.env['WEBHOOK_SECRET'] ?? 'default-secret-for-dev';

const webhookBodySchema = z.object({
  applicationId: z.string().uuid(),
  externalStatus: z.string(),
  provider: z.string(),
  timestamp: z.string(),
});

type WebhookBody = z.infer<typeof webhookBodySchema>;

const EXTERNAL_STATUS_MAP: Record<string, ApplicationStatus> = {
  pending_review: ApplicationStatus.UNDER_REVIEW,
  documents_needed: ApplicationStatus.DOCUMENTS_REQUESTED,
  approved: ApplicationStatus.APPROVED,
  rejected: ApplicationStatus.DENIED,
  cancelled: ApplicationStatus.WITHDRAWN,
};

function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function mapExternalStatus(externalStatus: string): ApplicationStatus | null {
  return EXTERNAL_STATUS_MAP[externalStatus] ?? null;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.requestContext.requestId;

  try {
    const signature = event.headers['x-webhook-signature'] ?? event.headers['X-Webhook-Signature'];

    if (signature === undefined || signature === '') {
      logger.warn('Missing webhook signature', { requestId });
      return error('Missing signature', 401);
    }

    const rawBody = event.body ?? '';

    if (!verifySignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature', { requestId });
      return error('Invalid signature', 401);
    }

    const body: unknown = JSON.parse(rawBody);
    const validation = webhookBodySchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Webhook validation failed', {
        requestId,
        errors: validation.error.format(),
      });
      return error('Validation failed', 400, validation.error.format());
    }

    const webhookData: WebhookBody = validation.data;

    logger.info('Processing webhook', {
      requestId,
      applicationId: webhookData.applicationId,
      provider: webhookData.provider,
      externalStatus: webhookData.externalStatus,
    });

    const mappedStatus = mapExternalStatus(webhookData.externalStatus);

    if (mappedStatus === null) {
      logger.warn('Unknown external status', {
        requestId,
        externalStatus: webhookData.externalStatus,
      });
      return error(`Unknown external status: ${webhookData.externalStatus}`, 400);
    }

    const application = await getApplication(webhookData.applicationId);

    if (!application) {
      logger.warn('Application not found', {
        requestId,
        applicationId: webhookData.applicationId,
      });
      return error('Application not found', 404);
    }

    const previousStatus = application.status;

    await updateApplicationStatus(
      webhookData.applicationId,
      previousStatus,
      mappedStatus,
      `Updated via webhook from ${webhookData.provider}`,
    );

    logger.info('Webhook processed successfully', {
      requestId,
      applicationId: webhookData.applicationId,
      previousStatus,
      newStatus: mappedStatus,
    });

    return success({ received: true });
  } catch (err) {
    logger.error('Error processing webhook', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return error('Internal server error', 500);
  }
};
