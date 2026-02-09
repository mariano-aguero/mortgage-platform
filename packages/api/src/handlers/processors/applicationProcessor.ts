import type { SQSHandler, SQSRecord } from 'aws-lambda';
import { getApplication } from '@services/dynamoService';
import { ApplicationStatus } from '../../types';
import type { MortgageApplication } from '../../types';
import * as logger from '../../utils/logger';

interface StatusChangeEvent {
  applicationId: string;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  userId: string;
  timestamp: string;
}

interface PreValidationResult {
  passed: boolean;
  checks: {
    incomePositive: boolean;
    loanAmountPositive: boolean;
    downPaymentValid: boolean;
    borrowerInfoComplete: boolean;
  };
}

interface CreditCheckResult {
  score: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

function performPreValidation(application: MortgageApplication): PreValidationResult {
  const checks = {
    incomePositive: application.borrowerInfo.annualIncome > 0,
    loanAmountPositive: application.propertyInfo.loanAmount > 0,
    downPaymentValid:
      application.propertyInfo.downPaymentPercentage >= 0 &&
      application.propertyInfo.downPaymentPercentage <= 100,
    borrowerInfoComplete:
      application.borrowerInfo.firstName.length > 0 &&
      application.borrowerInfo.lastName.length > 0 &&
      application.borrowerInfo.email.length > 0,
  };

  const passed = Object.values(checks).every(Boolean);

  return { passed, checks };
}

function performCreditCheck(): CreditCheckResult {
  const score = Math.floor(Math.random() * (850 - 600 + 1)) + 600;

  let rating: CreditCheckResult['rating'];
  if (score >= 750) {
    rating = 'excellent';
  } else if (score >= 700) {
    rating = 'good';
  } else if (score >= 650) {
    rating = 'fair';
  } else {
    rating = 'poor';
  }

  return { score, rating };
}

async function processRecord(record: SQSRecord): Promise<void> {
  const body = JSON.parse(record.body) as { detail: StatusChangeEvent };
  const event = body.detail;
  const correlationId = event.applicationId;

  logger.info('Processing status change event', {
    correlationId,
    previousStatus: event.previousStatus,
    newStatus: event.newStatus,
  });

  const application = await getApplication(event.applicationId);

  if (!application) {
    logger.error('Application not found', { correlationId });
    throw new Error(`Application ${event.applicationId} not found`);
  }

  switch (event.newStatus) {
    case ApplicationStatus.SUBMITTED: {
      const validationResult = performPreValidation(application);
      logger.info('Pre-validation completed', {
        correlationId,
        passed: validationResult.passed,
        checks: validationResult.checks,
      });
      break;
    }

    case ApplicationStatus.UNDER_REVIEW: {
      const creditResult = performCreditCheck();
      logger.info('Credit check completed', {
        correlationId,
        score: creditResult.score,
        rating: creditResult.rating,
      });
      break;
    }

    case ApplicationStatus.APPROVED: {
      logger.info('Application approved - ready for closing', {
        correlationId,
        userId: event.userId,
        approvedAt: new Date().toISOString(),
      });
      break;
    }

    default:
      logger.info('No processing required for status', {
        correlationId,
        status: event.newStatus,
      });
  }
}

export const handler: SQSHandler = async (event) => {
  logger.info('Processing batch', { recordCount: event.Records.length });

  const errors: Error[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to process record', {
        messageId: record.messageId,
        error: error.message,
      });
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Failed to process ${errors.length} records`);
  }

  logger.info('Batch processing completed', { recordCount: event.Records.length });
};
