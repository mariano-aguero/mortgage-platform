import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '@/config/api';

describe('API_ENDPOINTS', () => {
  it('should have applications endpoint', () => {
    expect(API_ENDPOINTS.applications).toBe('/applications');
  });

  it('should generate application endpoint with id', () => {
    expect(API_ENDPOINTS.application('123')).toBe('/applications/123');
    expect(API_ENDPOINTS.application('abc-def')).toBe('/applications/abc-def');
  });

  it('should generate application status endpoint with id', () => {
    expect(API_ENDPOINTS.applicationStatus('123')).toBe('/applications/123/status');
    expect(API_ENDPOINTS.applicationStatus('xyz')).toBe('/applications/xyz/status');
  });
});
