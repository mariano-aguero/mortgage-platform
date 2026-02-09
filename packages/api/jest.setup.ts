// Jest setup file for API tests

// Set test environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_TABLE = 'test-table';
process.env.S3_BUCKET_DOCUMENTS = 'test-bucket';
process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/test-queue';
process.env.SQS_QUEUE_ARN = 'arn:aws:sqs:us-east-1:000000000000:test-queue';
process.env.EVENT_BUS_NAME = 'test-event-bus';
process.env.COGNITO_USER_POOL_ID = 'us-east-1_test';
process.env.COGNITO_APP_CLIENT_ID = 'test-client-id';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';
process.env.ENVIRONMENT = 'test';

// Increase timeout for async tests
jest.setTimeout(10000);
