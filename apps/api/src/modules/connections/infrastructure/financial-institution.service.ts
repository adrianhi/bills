import { prisma } from '../../../config/database';
import { ParserRegistry } from '../../../ingestion/parser-registry';

export class FinancialInstitutionService {
  public async listInstitutions() {
    const institutions = await prisma.financialInstitution.findMany({
      where: { code: { not: 'CASH' } },
      orderBy: [{ status: 'asc' }, { displayName: 'asc' }],
    });
    const parserCodes = new Set(ParserRegistry.supportedInstitutionCodes());
    return institutions.map((institution) => ({
      ...institution,
      selectable: ['PILOT', 'ACTIVE'].includes(institution.status)
        && parserCodes.has(institution.code)
        && institution.senderPatterns.some((pattern) => pattern.trim()),
    }));
  }
}
