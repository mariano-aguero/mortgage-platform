import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { ApplicationStatus } from '../types';

// Configure EventBridge client - use LocalStack endpoint for local development
const isLocal = process.env.ENVIRONMENT === 'local' || process.env.NODE_ENV === 'local';
const localstackEndpoint = process.env.LOCALSTACK_ENDPOINT ?? 'http://localhost:4566';

const client = new EventBridgeClient({
  ...(isLocal && {
    endpoint: localstackEndpoint,
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});

const EVENT_BUS_NAME = process.env['EVENT_BUS_NAME'] ?? '';

interface StatusChangeEvent {
  applicationId: string;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  userId: string;
  timestamp: string;
}

export async function publishStatusChange(
  applicationId: string,
  previousStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
  userId: string,
): Promise<void> {
  const detail: StatusChangeEvent = {
    applicationId,
    previousStatus,
    newStatus,
    userId,
    timestamp: new Date().toISOString(),
  };

  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: 'mortgage.applications',
          DetailType: 'ApplicationStatusChanged',
          Detail: JSON.stringify(detail),
          EventBusName: EVENT_BUS_NAME,
        },
      ],
    }),
  );
}

export type { StatusChangeEvent };
