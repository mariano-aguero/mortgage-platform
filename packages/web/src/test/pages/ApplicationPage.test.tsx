import { describe, it, expect } from 'vitest';

describe('ApplicationPage', () => {
  it('should export the component', async () => {
    const ApplicationPage = await import('@/pages/ApplicationPage');
    expect(ApplicationPage.default).toBeDefined();
    expect(typeof ApplicationPage.default).toBe('function');
  });
});
