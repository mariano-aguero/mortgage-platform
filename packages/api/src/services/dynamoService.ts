import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { MortgageApplication, ApplicationStatus } from '../types';

// Configure DynamoDB client - use LocalStack endpoint for local development
const isLocal = process.env['ENVIRONMENT'] === 'local' || process.env['NODE_ENV'] === 'local';
const localstackEndpoint = process.env['LOCALSTACK_ENDPOINT'] ?? 'http://localhost:4566';

const client = new DynamoDBClient({
  ...(isLocal && {
    endpoint: localstackEndpoint,
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env['DYNAMODB_TABLE'] ?? '';

/**
 * DynamoDB Single-Table Design for Mortgage Applications
 *
 * Table Structure:
 * ┌─────────────────────┬─────────────────────┬──────────────────────────────────────┐
 * │ PK                  │ SK                  │ Description                          │
 * ├─────────────────────┼─────────────────────┼──────────────────────────────────────┤
 * │ APP#<applicationId> │ METADATA            │ Main application record              │
 * │ APP#<applicationId> │ STATUS#<timestamp>  │ Status change history record         │
 * └─────────────────────┴─────────────────────┴──────────────────────────────────────┘
 *
 * GSI1 (Query applications by user):
 * ┌─────────────────────┬─────────────────────┬──────────────────────────────────────┐
 * │ GSI1PK              │ GSI1SK              │ Use Case                             │
 * ├─────────────────────┼─────────────────────┼──────────────────────────────────────┤
 * │ USER#<userId>       │ <createdAt>         │ List all applications for a user     │
 * └─────────────────────┴─────────────────────┴──────────────────────────────────────┘
 *
 * GSI2 (Query applications by status):
 * ┌─────────────────────┬─────────────────────┬──────────────────────────────────────┐
 * │ GSI2PK              │ GSI2SK              │ Use Case                             │
 * ├─────────────────────┼─────────────────────┼──────────────────────────────────────┤
 * │ <status>            │ <createdAt>         │ List applications by status          │
 * └─────────────────────┴─────────────────────┴──────────────────────────────────────┘
 */
interface DynamoRecord extends MortgageApplication {
  /** Partition Key - Format: "APP#<applicationId>" - Groups all records for an application */
  PK: string;
  /** Sort Key - "METADATA" for main record, "STATUS#<timestamp>" for history */
  SK: string;
  /** GSI1 Partition Key - Format: "USER#<userId>" - Enables querying by user */
  GSI1PK?: string;
  /** GSI1 Sort Key - ISO timestamp of creation - Enables sorting by date */
  GSI1SK?: string;
  /** GSI2 Partition Key - Application status value - Enables querying by status */
  GSI2PK?: string;
  /** GSI2 Sort Key - ISO timestamp of creation - Enables sorting by date */
  GSI2SK?: string;
}

/**
 * Represents a status change history record in DynamoDB.
 * Stored with SK = "STATUS#<timestamp>" to maintain chronological order.
 */
interface StatusHistoryRecord {
  /** Partition Key - Format: "APP#<applicationId>" - Links to parent application */
  PK: string;
  /** Sort Key - Format: "STATUS#<ISO timestamp>" - Enables chronological queries */
  SK: string;
  /** The status before this change */
  previousStatus: ApplicationStatus;
  /** The status after this change */
  newStatus: ApplicationStatus;
  /** ISO timestamp when the status change occurred */
  timestamp: string;
  /** Optional notes explaining the status change */
  notes?: string;
}

function buildPK(applicationId: string): string {
  return `APP#${applicationId}`;
}

function buildUserGSI1PK(userId: string): string {
  return `USER#${userId}`;
}

export async function createApplication(app: MortgageApplication): Promise<MortgageApplication> {
  const record: DynamoRecord = {
    ...app,
    PK: buildPK(app.applicationId),
    SK: 'METADATA',
    GSI1PK: buildUserGSI1PK(app.userId),
    GSI1SK: app.createdAt,
    GSI2PK: app.status,
    GSI2SK: app.createdAt,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );

  return app;
}

export async function getApplication(applicationId: string): Promise<MortgageApplication | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: buildPK(applicationId),
        SK: 'METADATA',
      },
    }),
  );

  if (!result.Item) {
    return null;
  }

  return mapRecordToApplication(result.Item as DynamoRecord);
}

export async function listApplicationsByUser(userId: string): Promise<MortgageApplication[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': buildUserGSI1PK(userId),
      },
    }),
  );

  return (result.Items ?? []).map((item) => mapRecordToApplication(item as DynamoRecord));
}

export async function listApplicationsByStatus(
  status: ApplicationStatus,
  limit?: number,
): Promise<MortgageApplication[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'statusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
      Limit: limit,
      ScanIndexForward: false,
    }),
  );

  return (result.Items ?? []).map((item) => mapRecordToApplication(item as DynamoRecord));
}

export async function updateApplicationStatus(
  applicationId: string,
  previousStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
  notes?: string,
): Promise<MortgageApplication | null> {
  const now = new Date().toISOString();

  const updateResult = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: buildPK(applicationId),
        SK: 'METADATA',
      },
      UpdateExpression:
        'SET #status = :newStatus, updatedAt = :now, GSI2PK = :newStatus' +
        (notes !== undefined ? ', notes = :notes' : ''),
      ConditionExpression: '#status = :prevStatus',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':newStatus': newStatus,
        ':prevStatus': previousStatus,
        ':now': now,
        ...(notes !== undefined && { ':notes': notes }),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  const historyRecord: StatusHistoryRecord = {
    PK: buildPK(applicationId),
    SK: `STATUS#${now}`,
    previousStatus,
    newStatus,
    timestamp: now,
    notes,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: historyRecord,
    }),
  );

  if (!updateResult.Attributes) {
    return null;
  }

  return mapRecordToApplication(updateResult.Attributes as DynamoRecord);
}

export async function getApplicationHistory(applicationId: string): Promise<StatusHistoryRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': buildPK(applicationId),
        ':skPrefix': 'STATUS#',
      },
      ScanIndexForward: true,
    }),
  );

  return (result.Items ?? []) as StatusHistoryRecord[];
}

function mapRecordToApplication(record: DynamoRecord): MortgageApplication {
  return {
    applicationId: record.applicationId,
    userId: record.userId,
    status: record.status,
    borrowerInfo: record.borrowerInfo,
    propertyInfo: record.propertyInfo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    notes: record.notes,
  };
}

export type { StatusHistoryRecord };
