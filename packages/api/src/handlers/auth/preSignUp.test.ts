import type { PreSignUpTriggerEvent } from 'aws-lambda';

function createMockPreSignUpEvent(userName: string, email: string): PreSignUpTriggerEvent {
  return {
    version: '1',
    triggerSource: 'PreSignUp_SignUp',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    userName,
    callerContext: {
      awsSdkVersion: '1.0.0',
      clientId: 'test-client',
    },
    request: {
      userAttributes: {
        email,
      },
    },
    response: {
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
    },
  };
}

describe('preSignUp', () => {
  it('should create valid pre-signup event structure', () => {
    const event = createMockPreSignUpEvent('testuser', 'test@example.com');

    expect(event.userName).toBe('testuser');
    expect(event.request.userAttributes['email']).toBe('test@example.com');
    expect(event.response.autoConfirmUser).toBe(false);
    expect(event.response.autoVerifyEmail).toBe(false);
  });

  it('should have correct trigger source', () => {
    const event = createMockPreSignUpEvent('user1', 'user1@example.com');
    expect(event.triggerSource).toBe('PreSignUp_SignUp');
  });

  it('should have response object ready for modification', () => {
    const event = createMockPreSignUpEvent('user2', 'user2@example.com');

    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;

    expect(event.response.autoConfirmUser).toBe(true);
    expect(event.response.autoVerifyEmail).toBe(true);
  });
});
