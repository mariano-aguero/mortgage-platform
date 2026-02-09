import { describe, it, expect } from 'vitest';
import { ApplicationStatus } from '@/types';

describe('ApplicationStatus', () => {
  it('should have correct status values', () => {
    expect(ApplicationStatus.DRAFT).toBe('DRAFT');
    expect(ApplicationStatus.SUBMITTED).toBe('SUBMITTED');
    expect(ApplicationStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
    expect(ApplicationStatus.DOCUMENTS_REQUESTED).toBe('DOCUMENTS_REQUESTED');
    expect(ApplicationStatus.APPROVED).toBe('APPROVED');
    expect(ApplicationStatus.DENIED).toBe('DENIED');
    expect(ApplicationStatus.WITHDRAWN).toBe('WITHDRAWN');
  });

  it('should have all expected statuses', () => {
    const statuses = Object.values(ApplicationStatus);
    expect(statuses).toHaveLength(7);
  });
});
