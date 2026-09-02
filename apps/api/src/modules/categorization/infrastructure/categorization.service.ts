import { identifyMerchant, cleanRawMerchant } from '../domain/merchant-identity';

/** Compatibility facade for parser-independent normalization. */
export class CategorizationService {
  static cleanRawMerchant = cleanRawMerchant;
  static async categorize(raw: string, merchant?: string | null, category?: string | null) {
    const base = identifyMerchant(raw);
    return { merchant: merchant || base.label, category: category || base.category };
  }
}
