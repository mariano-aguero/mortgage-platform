/**
 * Login Page
 *
 * Professional fintech-styled login form with email and password authentication.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuthContext } from '@/context/AuthContext';

// Check if running in local development with mock auth
const isLocalDevMode =
  import.meta.env.VITE_SKIP_AUTH === 'true' && import.meta.env.VITE_ENVIRONMENT === 'local';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading: authLoading } = useAuthContext();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  function handleChange(field: keyof LoginFormData, value: string): void {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    const validation = LoginSchema.safeParse(formData);

    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof LoginFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const result = await signIn({
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setSubmitError(getErrorMessage(result.error ?? 'Sign in failed'));
    }

    setIsSubmitting(false);
  }

  function getErrorMessage(error: string): string {
    if (error.includes('Incorrect username or password')) {
      return 'Invalid email or password. Please try again.';
    }
    if (error.includes('User does not exist')) {
      return 'No account found with this email address.';
    }
    if (error.includes('User is not confirmed')) {
      return 'Please verify your email address before signing in.';
    }
    return error;
  }

  const isLoading = isSubmitting || authLoading;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Local Development Banner */}
      {isLocalDevMode && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Local Development Mode — Using mock authentication
          </span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Left side - Form */}
        <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm">
            {/* Logo */}
            <div className="mb-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">MortgageFlow</span>
              </Link>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to manage your mortgage applications
              </p>
            </div>

            {/* Error message */}
            {submitError !== null && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className={`input mt-1 ${errors['email'] !== undefined ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@example.com"
                />
                {errors['email'] !== undefined && (
                  <p className="mt-1 text-sm text-red-600">{errors['email']}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className={`input mt-1 ${errors['password'] !== undefined ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter your password"
                />
                {errors['password'] !== undefined && (
                  <p className="mt-1 text-sm text-red-600">{errors['password']}</p>
                )}
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary w-full py-2.5">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="mt-8 text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500">
                Create an account
              </Link>
            </p>

            {/* Local dev test credentials */}
            {isLocalDevMode && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-sm font-medium text-amber-800">Test Credentials:</p>
                <div className="space-y-1 text-xs text-amber-700">
                  <p>
                    <strong>User:</strong> testuser@example.com / TestUser123!
                  </p>
                  <p>
                    <strong>Loan Officer:</strong> loanoffice@example.com / LoanOfficer123!
                  </p>
                  <p>
                    <strong>Admin:</strong> admin@example.com / AdminUser123!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Image/Branding */}
        <div className="hidden bg-brand-900 lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-12">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-8 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-700">
                <svg
                  className="h-12 w-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white">Streamline Your Mortgage Process</h2>
            <p className="mt-4 text-lg text-brand-200">
              Apply, track, and manage your mortgage applications with ease. Get faster approvals
              with our digital-first platform.
            </p>
            <div className="mt-8 flex justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">24h</p>
                <p className="text-sm text-brand-300">Average Response</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">98%</p>
                <p className="text-sm text-brand-300">Customer Satisfaction</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">$2B+</p>
                <p className="text-sm text-brand-300">Loans Processed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
