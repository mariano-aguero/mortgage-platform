import { success, error } from './response';

describe('response helpers', () => {
  describe('success', () => {
    it('should return 200 status by default', () => {
      const result = success({ message: 'ok' });
      expect(result.statusCode).toBe(200);
    });

    it('should return custom status code', () => {
      const result = success({ id: '123' }, 201);
      expect(result.statusCode).toBe(201);
    });

    it('should include CORS headers', () => {
      const result = success({});
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should wrap data in ApiResponse format', () => {
      const data = { id: '123', name: 'Test' };
      const result = success(data);
      const body = JSON.parse(result.body) as { success: boolean; data: typeof data };
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });
  });

  describe('error', () => {
    it('should return 500 status by default', () => {
      const result = error('Something went wrong');
      expect(result.statusCode).toBe(500);
    });

    it('should return custom status code', () => {
      const result = error('Not found', 404);
      expect(result.statusCode).toBe(404);
    });

    it('should include CORS headers', () => {
      const result = error('Error');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    });

    it('should wrap error in ApiResponse format', () => {
      const result = error('Validation failed', 400, { field: 'email' });
      const body = JSON.parse(result.body) as {
        success: boolean;
        error: { message: string; details: unknown };
      };
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Validation failed');
      expect(body.error.details).toEqual({ field: 'email' });
    });
  });
});
