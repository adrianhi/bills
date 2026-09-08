import { afterEach, describe, expect, it } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { httpClient } from '@/shared/api';
import { proactiveService } from './proactive.service';

const mock = new AxiosMockAdapter(httpClient);

const sampleFeed = {
  currency: 'DOP',
  generatedAt: '2026-09-08T19:00:00.000Z',
  actions: [
    {
      id: 'imminent-bill-1',
      kind: 'IMMINENT_BILL',
      priority: 'HIGH',
      title: 'Cobro próximo: Claro Internet',
      description: 'Vence en 2 días por DOP 2,199. Asegúrate de tener saldo disponible.',
      ctaLabel: 'Ver en Fijos',
      actionType: 'NAVIGATE_RECURRING',
      dismissible: true,
      metadata: { billId: 'bill-1', expectedAmount: 2199 },
    },
  ],
  counts: {
    total: 1,
    imminentBills: 1,
    pacingRisks: 0,
    unclassified: 0,
  },
};

afterEach(() => mock.reset());

describe('proactiveService', () => {
  it('validates and maps the proactive feed contract', async () => {
    mock.onGet('/proactive/feed').reply(200, { success: true, data: sampleFeed });
    const result = await proactiveService.feed('DOP');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].kind).toBe('IMMINENT_BILL');
    expect(result.counts.total).toBe(1);
  });

  it('posts dismiss request to the action endpoint', async () => {
    mock.onPost('/proactive/actions/action-123/dismiss').reply(200, {
      success: true,
      data: { dismissed: true, actionId: 'action-123' },
    });
    await expect(proactiveService.dismiss('action-123')).resolves.toBeUndefined();
  });
});
