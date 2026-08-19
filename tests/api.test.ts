import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();
const API_KEY = 'bhd_secret_token_123456';

describe('Banco BHD REST API Integration Tests', () => {
  beforeAll(async () => {
    // Clear test database
    await prisma.transaction.deleteMany();
    await prisma.categoryRule.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Health Checks', () => {
    it('GET /health should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('POST /api/v1/transactions (Ingestion & Idempotency)', () => {
    it('should reject request without x-api-key with 401', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .send({
          externalId: 'ext_test_001',
          rawMerchant: 'SM BRAVO',
          amount: 1000,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid payload with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', API_KEY)
        .send({
          // missing externalId, amount, transactionDate
          rawMerchant: 'SM BRAVO',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('should ingest valid transaction with 201 Created and auto-categorize', async () => {
      const payload = {
        externalId: 'bhd_msg_test_001',
        cardLast4: '0380',
        cardType: 'Visa Débito Intl',
        rawMerchant: 'SM BRAVO LAS AMERICAS',
        amount: 1530.0,
        currency: 'DOP',
        status: 'Aprobada',
        transactionType: 'Compra',
        transactionDate: '2026-08-18T19:14:00.000Z',
        source: 'BHD_EMAIL',
      };

      const res = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', API_KEY)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.duplicate).toBe(false);
      expect(res.body.data.merchant).toBe('Supermercados Bravo');
      expect(res.body.data.category).toBe('Supermercado');
      expect(res.body.data.amount).toBe(1530);
      expect(res.body.data.currency).toBe('DOP');
    });

    it('should handle duplicate externalId idempotently with 200 OK', async () => {
      const payload = {
        externalId: 'bhd_msg_test_001', // Same externalId as above
        cardLast4: '0380',
        cardType: 'Visa Débito Intl',
        rawMerchant: 'SM BRAVO LAS AMERICAS',
        amount: 1530.0,
        currency: 'DOP',
        status: 'Aprobada',
        transactionType: 'Compra',
        transactionDate: '2026-08-18T19:14:00.000Z',
      };

      const res = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', API_KEY)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.duplicate).toBe(true);
      expect(res.body.data.externalId).toBe('bhd_msg_test_001');
    });
  });

  describe('POST /api/v1/transactions/batch', () => {
    it('should ingest multiple transactions in batch', async () => {
      const batchPayload = {
        transactions: [
          {
            externalId: 'bhd_msg_batch_1',
            cardLast4: '0380',
            rawMerchant: 'PEDIDOSYA *SUSHI',
            amount: 850,
            currency: 'DOP',
            transactionDate: '2026-08-18T20:00:00.000Z',
          },
          {
            externalId: 'bhd_msg_batch_2',
            cardLast4: '1234',
            rawMerchant: 'NETFLIX.COM',
            amount: 15.99,
            currency: 'USD',
            transactionDate: '2026-08-18T12:00:00.000Z',
          },
          {
            externalId: 'bhd_msg_test_001', // Duplicate should be detected
            rawMerchant: 'SM BRAVO',
            amount: 1530,
            transactionDate: '2026-08-18T19:14:00.000Z',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/transactions/batch')
        .set('x-api-key', API_KEY)
        .send(batchPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.createdCount).toBe(2);
      expect(res.body.data.duplicateCount).toBe(1);
    });
  });

  describe('GET /api/v1/transactions (Feed & Filters)', () => {
    it('should return paginated transactions and calculated summary statistics', async () => {
      const res = await request(app).get('/api/v1/transactions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalItems).toBe(3);
      expect(res.body.summary.totalDOP).toBe(2380); // 1530 + 850
      expect(res.body.summary.totalUSD).toBe(15.99);
      expect(res.body.summary.byCategory.Supermercado).toBeDefined();
    });

    it('should filter transactions by currency', async () => {
      const res = await request(app).get('/api/v1/transactions?currency=USD');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].merchant).toBe('Netflix');
      expect(res.body.data[0].currency).toBe('USD');
    });

    it('should filter transactions by category', async () => {
      const res = await request(app).get('/api/v1/transactions?category=Supermercado');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].merchant).toBe('Supermercados Bravo');
    });
  });

  describe('GET /api/v1/transactions/export (CSV & JSON Stream)', () => {
    it('should export transactions as CSV with proper headers and UTF-8 BOM', async () => {
      const res = await request(app).get('/api/v1/transactions/export?format=csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename="transacciones-bhd-');
      expect(res.text).toContain('ID Transacción');
      expect(res.text).toContain('Supermercados Bravo');
      expect(res.text).toContain('Netflix');
    });

    it('should export transactions as JSON', async () => {
      const res = await request(app).get('/api/v1/transactions/export?format=json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.success).toBe(true);
      expect(res.body.totalCount).toBe(3);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/stats/summary', () => {
    it('should return financial summary, category breakdowns, and top merchants', async () => {
      const res = await request(app).get('/api/v1/stats/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTransactions).toBe(3);
      expect(res.body.data.totalSpentDOP).toBe(2380);
      expect(res.body.data.totalSpentUSD).toBe(15.99);
      expect(res.body.data.topMerchants.length).toBeGreaterThan(0);
    });
  });

  describe('CRUD Operations on Transactions', () => {
    it('should update category and notes on an existing transaction', async () => {
      const list = await request(app).get('/api/v1/transactions');
      const item = list.body.data[0];

      const res = await request(app)
        .patch(`/api/v1/transactions/${item.id}`)
        .send({
          category: 'Gastos Especiales',
          notes: 'Compra mensual para despensa',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category).toBe('Gastos Especiales');
      expect(res.body.data.notes).toBe('Compra mensual para despensa');
    });

    it('should delete a transaction by ID', async () => {
      const list = await request(app).get('/api/v1/transactions');
      const item = list.body.data[0];

      const res = await request(app).delete(`/api/v1/transactions/${item.id}`);
      expect(res.status).toBe(200);

      const check = await request(app).get(`/api/v1/transactions/${item.id}`);
      expect(check.status).toBe(404);
    });
  });
});
