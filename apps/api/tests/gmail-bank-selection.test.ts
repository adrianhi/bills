import { describe, expect, it } from 'vitest';
import { gmailInitialCutoff } from '../src/modules/connections';
import { InstitutionSelectionService } from '../src/modules/connections/infrastructure/institution-selection.service';

describe('Gmail bank selection policy', () => {
  it('normalizes and deduplicates selected institution codes', () => {
    expect(InstitutionSelectionService.normalize([' bhd ', 'BANRESERVAS', 'BHD', '']))
      .toEqual(['BHD', 'BANRESERVAS']);
  });

  it('starts a two-month initial window at midnight in Santo Domingo', () => {
    expect(gmailInitialCutoff(new Date('2026-08-29T18:00:00.000Z'), 2).toISOString())
      .toBe('2026-07-01T04:00:00.000Z');
    expect(gmailInitialCutoff(new Date('2026-01-15T12:00:00.000Z'), 2).toISOString())
      .toBe('2025-12-01T04:00:00.000Z');
  });
});
