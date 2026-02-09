import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('AuthContext', () => {
  it('should export AuthProvider component', async () => {
    const { AuthProvider } = await import('@/context/AuthContext');
    expect(AuthProvider).toBeDefined();
    expect(typeof AuthProvider).toBe('function');
  });

  it('should export useAuthContext hook', async () => {
    const { useAuthContext } = await import('@/context/AuthContext');
    expect(useAuthContext).toBeDefined();
    expect(typeof useAuthContext).toBe('function');
  });

  it('should export ProtectedRoute component', async () => {
    const { ProtectedRoute } = await import('@/context/AuthContext');
    expect(ProtectedRoute).toBeDefined();
    expect(typeof ProtectedRoute).toBe('function');
  });

  it('should throw error when useAuthContext is used outside provider', async () => {
    const { useAuthContext } = await import('@/context/AuthContext');

    // This test verifies the error message is correct
    expect(() => {
      // Simulate calling the hook outside of provider context
      // In real usage, React would throw an error
      const TestComponent = (): JSX.Element => {
        useAuthContext();
        return <div>Test</div>;
      };

      // This would throw in a real component tree without AuthProvider
      render(
        <MemoryRouter>
          <TestComponent />
        </MemoryRouter>,
      );
    }).toThrow('useAuthContext must be used within an AuthProvider');
  });
});
