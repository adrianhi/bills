import { describe, it, expect, vi } from 'vitest';
import { BetaInterestService, type BetaInterestRepository } from '../src/modules/auth/application/beta-interest.service';

describe('BetaInterestService', () => {
  it('registers a new email successfully with trimmed lowercase format', async () => {
    const mockRepo: BetaInterestRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id', email: 'usuario@correo.com' }),
    };

    const service = new BetaInterestService(mockRepo);
    const result = await service.register({
      email: '  Usuario@Correo.COM  ',
      source: 'LANDING_HERO',
      campaignCode: 'CREATOR_1',
    });

    expect(result.success).toBe(true);
    expect(result.alreadyRegistered).toBeUndefined();
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('usuario@correo.com');
    expect(mockRepo.create).toHaveBeenCalledWith({
      email: 'usuario@correo.com',
      source: 'LANDING_HERO',
      campaignCode: 'CREATOR_1',
      referredBy: undefined,
    });
  });

  it('returns idempotent success without error if email already exists', async () => {
    const mockRepo: BetaInterestRepository = {
      findByEmail: vi.fn().mockResolvedValue({ id: 'existing-id', email: 'existente@correo.com' }),
      create: vi.fn(),
    };

    const service = new BetaInterestService(mockRepo);
    const result = await service.register({
      email: 'existente@correo.com',
    });

    expect(result.success).toBe(true);
    expect(result.alreadyRegistered).toBe(true);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('throws validation error for invalid email format', async () => {
    const mockRepo: BetaInterestRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };

    const service = new BetaInterestService(mockRepo);
    await expect(service.register({ email: 'correo-invalido' })).rejects.toThrow();
  });
});
