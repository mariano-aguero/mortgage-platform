import type { APIGatewayProxyEvent } from 'aws-lambda';

export type UserRole = 'borrower' | 'loan_officer' | 'admin';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

// Check if running in local development mode
const isLocalDev = process.env.ENVIRONMENT === 'local' || process.env.NODE_ENV === 'local';

/**
 * Parse mock JWT token for local development
 * Format: mock.<base64-payload>.local
 */
function parseMockToken(authHeader: string): Record<string, unknown> | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    if (!token.startsWith('mock.') || !token.endsWith('.local')) {
      return null;
    }
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

export function extractUser(event: APIGatewayProxyEvent): AuthenticatedUser | null {
  // Try to get claims from Cognito authorizer first
  const authorizer = event.requestContext.authorizer as Record<string, unknown> | undefined;
  let claims = authorizer?.['claims'] as Record<string, unknown> | undefined;

  // For local development, parse mock token from Authorization header
  if (!claims && isLocalDev) {
    const authHeader = event.headers['Authorization'] ?? event.headers['authorization'];
    if (authHeader) {
      claims = parseMockToken(authHeader) ?? undefined;
    }
  }

  if (!claims) {
    return null;
  }

  const userId = claims['sub'] as string | undefined;
  const email = (claims['email'] as string) ?? '';
  const cognitoGroups = claims['cognito:groups'];

  // Handle groups as array or string
  let groupsStr = '';
  if (Array.isArray(cognitoGroups)) {
    groupsStr = cognitoGroups.join(',');
  } else if (typeof cognitoGroups === 'string') {
    groupsStr = cognitoGroups;
  }

  let role: UserRole = 'borrower';
  if (groupsStr.toLowerCase().includes('admin')) {
    role = 'admin';
  } else if (groupsStr.toLowerCase().includes('loanofficer') || groupsStr.toLowerCase().includes('loan_officer')) {
    role = 'loan_officer';
  }

  if (userId === undefined || userId === '') {
    return null;
  }

  return { userId, email, role };
}

export function hasElevatedRole(user: AuthenticatedUser): boolean {
  return user.role === 'admin' || user.role === 'loan_officer';
}
