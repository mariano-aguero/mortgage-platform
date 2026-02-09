import type { PreSignUpTriggerHandler, PreSignUpTriggerEvent } from 'aws-lambda';
import * as logger from '../../utils/logger';

// eslint-disable-next-line @typescript-eslint/require-await -- Cognito trigger requires async handler
export const handler: PreSignUpTriggerHandler = async (event: PreSignUpTriggerEvent) => {
  const { userName, request } = event;

  logger.info('Pre sign-up trigger invoked', {
    userName,
    email: request.userAttributes['email'],
    userPoolId: event.userPoolId,
  });

  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  if (request.userAttributes['custom:role'] === undefined) {
    logger.info('Setting default role for user', {
      userName,
      role: 'borrower',
    });
  }

  logger.info('User auto-confirmed', {
    userName,
    autoConfirmed: true,
    autoVerifyEmail: true,
  });

  return event;
};
