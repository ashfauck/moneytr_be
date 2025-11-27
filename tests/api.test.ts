import request from 'supertest';
import app from '../src/server';

describe('Health Endpoints', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('status', 'healthy');
  });

  it('should return database health status', async () => {
    const response = await request(app).get('/health/db');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});

describe('Root Endpoint', () => {
  it('should return API information', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'MoneyTR Phone Authentication API');
  });
});

describe('Authentication - Validate Phone', () => {
  it('should validate phone number format', async () => {
    const response = await request(app)
      .post('/api/step-auth/login/validate-phone')
      .send({ phoneNumber: 'invalid-phone' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should accept valid international phone number', async () => {
    const response = await request(app)
      .post('/api/step-auth/login/validate-phone')
      .send({ phoneNumber: '+14155552671' });
    
    // Should return 404 if user doesn't exist or 200 if exists
    expect([200, 404]).toContain(response.status);
  });
});
