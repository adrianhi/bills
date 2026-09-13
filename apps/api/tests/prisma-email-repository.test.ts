import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/config/database';
import { PrismaEmailRepository } from '../src/modules/proactivity/infrastructure/prisma-email.repository';

vi.mock('../src/config/database', () => {
  const mockTx = {
    emailDeliveryEvent: { create: vi.fn() },
    emailDelivery: { updateMany: vi.fn() },
    emailNotificationPreference: { updateMany: vi.fn() },
    productEvent: { upsert: vi.fn() },
  };
  return {
    prisma: {
      emailDelivery: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      emailDeliveryEvent: {
        create: vi.fn(),
      },
      emailNotificationPreference: {
        updateMany: vi.fn(),
      },
      productEvent: {
        upsert: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
      __mockTx: mockTx,
    },
  };
});

describe('PrismaEmailRepository.recordProviderEvent', () => {
  const repository = new PrismaEmailRepository();
  const mockPrisma = prisma as unknown as {
    emailDelivery: { findUnique: ReturnType<typeof vi.fn> };
    __mockTx: {
      emailDeliveryEvent: { create: ReturnType<typeof vi.fn> };
      emailDelivery: { updateMany: ReturnType<typeof vi.fn> };
      emailNotificationPreference: { updateMany: ReturnType<typeof vi.fn> };
      productEvent: { upsert: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records delivery event without leaking providerMessageId into emailDeliveryEvent', async () => {
    mockPrisma.emailDelivery.findUnique.mockResolvedValue({
      id: 'delivery-uuid-123',
      workspaceId: 'workspace-uuid-456',
      profileId: 'profile-uuid-789',
    });

    const occurredAt = new Date('2026-09-13T04:55:26.518Z');
    const result = await repository.recordProviderEvent({
      providerEventId: 'msg_3JG70S5rSHEcb9Katm6seVXv0Ep',
      providerMessageId: '78a7c233-7a3e-4e6f-b3d3-b869103aedfb',
      type: 'email.delivered',
      occurredAt,
    });

    expect(result).toBe(true);
    expect(mockPrisma.emailDelivery.findUnique).toHaveBeenCalledWith({
      where: { providerMessageId: '78a7c233-7a3e-4e6f-b3d3-b869103aedfb' },
    });

    const createCall = mockPrisma.__mockTx.emailDeliveryEvent.create.mock.calls[0][0];
    expect(createCall.data).toEqual({
      deliveryId: 'delivery-uuid-123',
      providerEventId: 'msg_3JG70S5rSHEcb9Katm6seVXv0Ep',
      type: 'email.delivered',
      occurredAt,
    });
    expect(createCall.data).not.toHaveProperty('providerMessageId');

    expect(mockPrisma.__mockTx.emailDelivery.updateMany).toHaveBeenCalledWith({
      where: { id: 'delivery-uuid-123', status: { in: ['ACCEPTED'] } },
      data: {
        status: 'DELIVERED',
        deliveredAt: occurredAt,
        processedAt: occurredAt,
      },
    });
  });

  it('disables notifications on bounce event', async () => {
    mockPrisma.emailDelivery.findUnique.mockResolvedValue({
      id: 'delivery-uuid-123',
      workspaceId: 'workspace-uuid-456',
      profileId: 'profile-uuid-789',
    });

    const occurredAt = new Date('2026-09-13T04:55:26.518Z');
    const result = await repository.recordProviderEvent({
      providerEventId: 'evt_bounce_123',
      providerMessageId: 'msg_bounce_123',
      type: 'email.bounced',
      occurredAt,
    });

    expect(result).toBe(true);
    expect(mockPrisma.__mockTx.emailNotificationPreference.updateMany).toHaveBeenCalledWith({
      where: { profileId: 'profile-uuid-789' },
      data: {
        weeklyDigestEnabled: false,
        criticalAlertsEnabled: false,
        nextWeeklyDigestAt: null,
      },
    });
  });

  it('returns false when delivery is not found', async () => {
    mockPrisma.emailDelivery.findUnique.mockResolvedValue(null);

    const result = await repository.recordProviderEvent({
      providerEventId: 'evt_unknown',
      providerMessageId: 'msg_unknown',
      type: 'email.delivered',
      occurredAt: new Date(),
    });

    expect(result).toBe(false);
    expect(mockPrisma.__mockTx.emailDeliveryEvent.create).not.toHaveBeenCalled();
  });

  it('returns false idempotently on duplicate providerEventId (P2002)', async () => {
    mockPrisma.emailDelivery.findUnique.mockResolvedValue({
      id: 'delivery-uuid-123',
      workspaceId: 'workspace-uuid-456',
      profileId: 'profile-uuid-789',
    });
    mockPrisma.__mockTx.emailDeliveryEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    const result = await repository.recordProviderEvent({
      providerEventId: 'evt_duplicate',
      providerMessageId: 'msg_duplicate',
      type: 'email.delivered',
      occurredAt: new Date(),
    });

    expect(result).toBe(false);
  });
});
