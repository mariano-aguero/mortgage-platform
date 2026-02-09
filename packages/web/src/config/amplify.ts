/**
 * AWS Amplify Configuration
 *
 * Configures Cognito authentication based on environment variables.
 * Supports both AWS and LocalStack environments.
 */

import { Amplify } from 'aws-amplify';

interface AmplifyConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
}

function getEnvVar(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  const value = import.meta.env[name] as string | undefined;
  return value ?? defaultValue;
}

export function getAmplifyConfig(): AmplifyConfig {
  return {
    userPoolId: getEnvVar('VITE_COGNITO_USER_POOL_ID'),
    userPoolClientId: getEnvVar('VITE_COGNITO_APP_CLIENT_ID'),
    region: getOptionalEnvVar('VITE_AWS_REGION', 'us-east-1'),
  };
}

export function isLocalStackEnabled(): boolean {
  return import.meta.env['VITE_USE_LOCALSTACK'] === 'true';
}

export function getLocalStackEndpoint(): string {
  return getOptionalEnvVar('VITE_LOCALSTACK_ENDPOINT', 'http://localhost:4566');
}

export function isAuthSkipped(): boolean {
  // Only skip auth in local environment with explicit flag
  return (
    import.meta.env['VITE_SKIP_AUTH'] === 'true' && import.meta.env['VITE_ENVIRONMENT'] === 'local'
  );
}

export function configureAmplify(): void {
  // Skip Amplify configuration if auth is disabled (local development)
  if (isAuthSkipped()) {
    console.info('Authentication skipped - using mock auth for local development');
    return;
  }

  const config = getAmplifyConfig();
  const isLocalStack = isLocalStackEnabled();

  const amplifyConfig = {
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        ...(isLocalStack && {
          endpoint: `${getLocalStackEndpoint()}/cognito-idp`,
        }),
      },
    },
  };

  Amplify.configure(amplifyConfig);

  if (isLocalStack) {
    console.info('Amplify configured for LocalStack development');
  }
}

export { getEnvVar, getOptionalEnvVar };
