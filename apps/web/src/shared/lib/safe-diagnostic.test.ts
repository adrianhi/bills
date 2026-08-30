import { describe, expect, it } from 'vitest';
import { ApiClientError } from '@/shared/api';
import { safeDiagnostic } from './safe-diagnostic';

describe('safeDiagnostic', () => {
  it('includes support identifiers without leaking the error message or financial data', () => {
    const error = new ApiClientError('Falló la compra RD$ 5,000 en COLMADO SECRETO', 'SYNC_FAILED', 500, 'req-safe-1', {
      merchant: 'COLMADO SECRETO', amount: 5_000,
    });
    const result = safeDiagnostic(error, 'conexiones', { estado: 'REAUTH_REQUIRED' });

    expect(result).toContain('código=SYNC_FAILED');
    expect(result).toContain('requestId=req-safe-1');
    expect(result).toContain('estado=REAUTH_REQUIRED');
    expect(result).not.toContain('COLMADO SECRETO');
    expect(result).not.toContain('5,000');
    expect(result).not.toContain('Falló la compra');
  });
});
