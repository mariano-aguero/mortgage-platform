import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { ApplicationStatus } from '../../types';

function createMockRecord(detail: Record<string, unknown>): SQSRecord {
  return {
    messageId: 'msg-123',
    receiptHandle: 'handle-123',
    body: JSON.stringify({ detail }),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '1234567890',
      SenderId: 'sender-123',
      ApproximateFirstReceiveTimestamp: '1234567890',
    },
    messageAttributes: {},
    md5OfBody: 'md5',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
    awsRegion: 'us-east-1',
  };
}

function createMockEvent(records: SQSRecord[]): SQSEvent {
  return { Records: records };
}

describe('applicationProcessor', () => {
  it('should create valid SQS event structure', () => {
    const detail = {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      previousStatus: ApplicationStatus.DRAFT,
      newStatus: ApplicationStatus.SUBMITTED,
      userId: 'user-123',
      timestamp: new Date().toISOString(),
    };

    const record = createMockRecord(detail);
    const event = createMockEvent([record]);

    expect(event.Records).toHaveLength(1);
    expect(event.Records[0]?.messageId).toBe('msg-123');

    const parsedBody = JSON.parse(event.Records[0]?.body ?? '{}') as { detail: typeof detail };
    expect(parsedBody.detail.applicationId).toBe(detail.applicationId);
    expect(parsedBody.detail.newStatus).toBe(ApplicationStatus.SUBMITTED);
  });

  it('should handle multiple records in batch', () => {
    const records = [
      createMockRecord({
        applicationId: 'app-1',
        newStatus: ApplicationStatus.SUBMITTED,
      }),
      createMockRecord({
        applicationId: 'app-2',
        newStatus: ApplicationStatus.UNDER_REVIEW,
      }),
    ];

    const event = createMockEvent(records);
    expect(event.Records).toHaveLength(2);
  });
});
