/**
 * useAuth Hook
 *
 * Custom hook that provides authentication state and methods.
 * Wraps the auth service for use in React components.
 */

import { useState, useEffect, useCallback } from 'react';
import type { AuthUser, SignInInput, SignUpInput } from '@/types';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getCurrentUser,
  type AuthResult,
  type SignInResult,
  type SignUpResult,
} from '@/services/auth';

export interface UseAuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UseAuthActions {
  signIn: (input: SignInInput) => Promise<AuthResult<SignInResult>>;
  signUp: (input: SignUpInput) => Promise<AuthResult<SignUpResult>>;
  signOut: () => Promise<AuthResult<void>>;
  refreshUser: () => Promise<void>;
}

export type UseAuthReturn = UseAuthState & UseAuthActions;

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async (): Promise<void> => {
    try {
      const result = await getCurrentUser();
      if (result.success && result.data !== undefined) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const signIn = useCallback(async (input: SignInInput): Promise<AuthResult<SignInResult>> => {
    setIsLoading(true);
    const result = await authSignIn(input);

    if (result.success) {
      const userResult = await getCurrentUser();
      if (userResult.success && userResult.data !== undefined) {
        setUser(userResult.data);
      }
    }

    setIsLoading(false);
    return result;
  }, []);

  const signUp = useCallback(async (input: SignUpInput): Promise<AuthResult<SignUpResult>> => {
    const result = await authSignUp(input);
    return result;
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult<void>> => {
    setIsLoading(true);
    const result = await authSignOut();

    if (result.success) {
      setUser(null);
    }

    setIsLoading(false);
    return result;
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    await checkSession();
  }, [checkSession]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };
}
