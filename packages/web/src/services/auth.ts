/**
 * Authentication Service
 *
 * Provides authentication methods using AWS Amplify with Cognito.
 * Supports mock authentication for local development.
 */

import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendCode,
  type SignInInput as AmplifySignInInput,
  type SignUpInput as AmplifySignUpInput,
} from '@aws-amplify/auth';
import type { AuthUser, SignInInput, SignUpInput } from '@/types';

// Check if we should skip authentication (local development only)
// Both conditions must be true: SKIP_AUTH enabled AND environment is local
const SKIP_AUTH =
  import.meta.env.VITE_SKIP_AUTH === 'true' && import.meta.env.VITE_ENVIRONMENT === 'local';

// Mock user for local development
const MOCK_USERS: Record<string, { password: string; user: AuthUser }> = {
  'testuser@example.com': {
    password: 'TestUser123!',
    user: { userId: 'local-user-1', email: 'testuser@example.com', groups: [] },
  },
  'loanoffice@example.com': {
    password: 'LoanOfficer123!',
    user: { userId: 'local-user-2', email: 'loanoffice@example.com', groups: ['LoanOfficers'] },
  },
  'admin@example.com': {
    password: 'AdminUser123!',
    user: { userId: 'local-user-3', email: 'admin@example.com', groups: ['Admins'] },
  },
};

// Session storage key for mock auth
const MOCK_AUTH_KEY = 'mock_auth_user';

export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SignInResult {
  isSignedIn: boolean;
  nextStep?: {
    signInStep: string;
  };
}

export interface SignUpResult {
  isSignUpComplete: boolean;
  userId?: string;
  nextStep?: {
    signUpStep: string;
  };
}

/**
 * Sign in a user with email and password
 */
export async function signIn(input: SignInInput): Promise<AuthResult<SignInResult>> {
  // Mock authentication for local development
  if (SKIP_AUTH) {
    const mockUser = MOCK_USERS[input.email];
    if (mockUser && mockUser.password === input.password) {
      sessionStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(mockUser.user));
      return {
        success: true,
        data: { isSignedIn: true },
      };
    }
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  try {
    const signInInput: AmplifySignInInput = {
      username: input.email,
      password: input.password,
    };

    const result = await amplifySignIn(signInInput);

    return {
      success: true,
      data: {
        isSignedIn: result.isSignedIn,
        nextStep: result.nextStep
          ? {
              signInStep: result.nextStep.signInStep,
            }
          : undefined,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign in failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Sign up a new user
 */
export async function signUp(input: SignUpInput): Promise<AuthResult<SignUpResult>> {
  try {
    const signUpInput: AmplifySignUpInput = {
      username: input.email,
      password: input.password,
      options: {
        userAttributes: {
          email: input.email,
          given_name: input.firstName,
          family_name: input.lastName,
        },
      },
    };

    const result = await amplifySignUp(signUpInput);

    return {
      success: true,
      data: {
        isSignUpComplete: result.isSignUpComplete,
        userId: result.userId,
        nextStep: result.nextStep
          ? {
              signUpStep: result.nextStep.signUpStep,
            }
          : undefined,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign up failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Confirm sign up with verification code
 */
export async function confirmSignUp(
  email: string,
  code: string,
): Promise<AuthResult<{ isSignUpComplete: boolean }>> {
  try {
    const result = await amplifyConfirmSignUp({
      username: email,
      confirmationCode: code,
    });

    return {
      success: true,
      data: {
        isSignUpComplete: result.isSignUpComplete,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Confirmation failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Resend sign up verification code
 */
export async function resendSignUpCode(email: string): Promise<AuthResult<void>> {
  try {
    await amplifyResendCode({
      username: email,
    });

    return {
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend code';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult<void>> {
  // Mock sign out for local development
  if (SKIP_AUTH) {
    sessionStorage.removeItem(MOCK_AUTH_KEY);
    return { success: true };
  }

  try {
    await amplifySignOut();
    return {
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign out failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<AuthResult<AuthUser>> {
  // Mock get current user for local development
  if (SKIP_AUTH) {
    const stored = sessionStorage.getItem(MOCK_AUTH_KEY);
    if (stored) {
      return {
        success: true,
        data: JSON.parse(stored) as AuthUser,
      };
    }
    return {
      success: false,
      error: 'No user signed in',
    };
  }

  try {
    const user = await amplifyGetCurrentUser();
    const session = await fetchAuthSession();

    const idToken = session.tokens?.idToken;
    const groups: string[] = [];

    if (idToken) {
      const payload = idToken.payload;
      const cognitoGroups = payload['cognito:groups'];
      if (Array.isArray(cognitoGroups)) {
        groups.push(...(cognitoGroups as string[]));
      }
    }

    return {
      success: true,
      data: {
        userId: user.userId,
        email: user.signInDetails?.loginId ?? '',
        groups,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get current user';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get the current JWT access token
 */
export async function getAccessToken(): Promise<string | null> {
  // Return mock token for local development
  if (SKIP_AUTH) {
    const stored = sessionStorage.getItem(MOCK_AUTH_KEY);
    if (stored) {
      return 'mock-access-token-local-dev';
    }
    return null;
  }

  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();
    return accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the current JWT ID token
 */
export async function getIdToken(): Promise<string | null> {
  // Return mock token for local development
  if (SKIP_AUTH) {
    const stored = sessionStorage.getItem(MOCK_AUTH_KEY);
    if (stored) {
      const user = JSON.parse(stored) as AuthUser;
      // Create a mock JWT-like token with user info
      const payload = {
        sub: user.userId,
        email: user.email,
        'cognito:groups': user.groups,
      };
      // Base64 encode the payload (not a real JWT, but enough for local dev)
      return `mock.${btoa(JSON.stringify(payload))}.local`;
    }
    return null;
  }

  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    return idToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  // Mock check for local development
  if (SKIP_AUTH) {
    return sessionStorage.getItem(MOCK_AUTH_KEY) !== null;
  }

  try {
    await amplifyGetCurrentUser();
    return true;
  } catch {
    return false;
  }
}
