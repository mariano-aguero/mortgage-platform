/**
 * Applications List Page
 *
 * Displays all mortgage applications for the current user.
 * Redirects to dashboard which shows the same content.
 */

import { Navigate } from 'react-router-dom';

function ApplicationsListPage(): JSX.Element {
  // Redirect to dashboard which shows the applications list
  return <Navigate to="/dashboard" replace />;
}

export default ApplicationsListPage;
