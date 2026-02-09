import type { APIGatewayProxyEvent } from 'aws-lambda';
import { extractUser, hasElevatedRole } from './auth';
import type { AuthenticatedUser } from './auth';

function createMockEvent(claims?: Record<string, string>): APIGatewayProxyEvent {
  return {
    requestContext: {
      authorizer: claims ? { claims } : undefined,
    },
  } as APIGatewayProxyEvent;
}

describe('extractUser', () => {
  it('should return null if no authorizer claims', () => {
    const event = createMockEvent();
    expect(extractUser(event)).toBeNull();
  });

  it('should return null if no sub claim', () => {
    const event = createMockEvent({ email: 'test@example.com' });
    expect(extractUser(event)).toBeNull();
  });

  it('should extract user with borrower role by default', () => {
    const event = createMockEvent({
      sub: 'user-123',
      email: 'test@example.com',
    });
    const user = extractUser(event);
    expect(user).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'borrower',
    });
  });

  it('should detect loan_officer role', () => {
    const event = createMockEvent({
      sub: 'user-456',
      email: 'officer@example.com',
      'cognito:groups': 'loan_officer',
    });
    const user = extractUser(event);
    expect(user?.role).toBe('loan_officer');
  });

  it('should detect admin role', () => {
    const event = createMockEvent({
      sub: 'user-789',
      email: 'admin@example.com',
      'cognito:groups': 'admin,loan_officer',
    });
    const user = extractUser(event);
    expect(user?.role).toBe('admin');
  });
});

describe('hasElevatedRole', () => {
  it('should return true for admin', () => {
    const user: AuthenticatedUser = { userId: '1', email: 'a@b.com', role: 'admin' };
    expect(hasElevatedRole(user)).toBe(true);
  });

  it('should return true for loan_officer', () => {
    const user: AuthenticatedUser = { userId: '1', email: 'a@b.com', role: 'loan_officer' };
    expect(hasElevatedRole(user)).toBe(true);
  });

  it('should return false for borrower', () => {
    const user: AuthenticatedUser = { userId: '1', email: 'a@b.com', role: 'borrower' };
    expect(hasElevatedRole(user)).toBe(false);
  });
});
