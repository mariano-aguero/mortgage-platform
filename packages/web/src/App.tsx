/**
 * App Component
 *
 * Main application component with routing and authentication.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, ProtectedRoute } from '@/context/AuthContext';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const Layout = lazy(() => import('@/components/Layout/Layout'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ApplicationPage = lazy(() => import('@/pages/ApplicationPage'));
const NewApplicationPage = lazy(() => import('@/pages/NewApplicationPage'));
const ApplicationsListPage = lazy(() => import('@/pages/ApplicationsListPage'));

function LoadingSpinner(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function App(): JSX.Element {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsListPage />} />
            <Route path="applications/new" element={<NewApplicationPage />} />
            <Route path="applications/:id" element={<ApplicationPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
