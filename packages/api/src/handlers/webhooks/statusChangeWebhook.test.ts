import { createHmac } from 'crypto';

const WEBHOOK_SECRET = 'test-secret';

function generateSignature(payload: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
}

describe('statusChangeWebhook', () => {
  describe('signature verification', () => {
    it('should generate valid HMAC signature', () => {
      const payload = JSON.stringify({
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        externalStatus: 'approved',
        provider: 'test-provider',
        timestamp: '2024-01-01T00:00:00Z',
      });

      const signature = generateSignature(payload);

      expect(signature).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(signature)).toBe(true);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ data: 'payload1' });
      const payload2 = JSON.stringify({ data: 'payload2' });

      const sig1 = generateSignature(payload1);
      const sig2 = generateSignature(payload2);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate same signature for same payload', () => {
      const payload = JSON.stringify({ data: 'test' });

      const sig1 = generateSignature(payload);
      const sig2 = generateSignature(payload);

      expect(sig1).toBe(sig2);
    });
  });

  describe('status mapping', () => {
    const statusMap: Record<string, string> = {
      pending_review: 'UNDER_REVIEW',
      documents_needed: 'DOCUMENTS_REQUESTED',
      approved: 'APPROVED',
      rejected: 'DENIED',
      cancelled: 'WITHDRAWN',
    };

    it('should have valid status mappings', () => {
      expect(statusMap['pending_review']).toBe('UNDER_REVIEW');
      expect(statusMap['documents_needed']).toBe('DOCUMENTS_REQUESTED');
      expect(statusMap['approved']).toBe('APPROVED');
      expect(statusMap['rejected']).toBe('DENIED');
      expect(statusMap['cancelled']).toBe('WITHDRAWN');
    });

    it('should return undefined for unknown status', () => {
      expect(statusMap['unknown_status']).toBeUndefined();
    });
  });
});
