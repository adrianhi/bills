import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { ParserRegistry } from '../../../ingestion/parser-registry';

export class InstitutionSelectionService {
  public static normalize(codes: string[]) {
    return Array.from(new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
  }

  public static async validate(codes: string[]) {
    const normalized = this.normalize(codes);
    if (!normalized.length) {
      throw new AppError(400, 'BANK_SELECTION_REQUIRED', 'Select at least one supported bank.');
    }
    const parserCodes = new Set(ParserRegistry.supportedInstitutionCodes());
    const institutions = await prisma.financialInstitution.findMany({
      where: { code: { in: normalized } },
      select: { code: true, status: true, senderPatterns: true },
    });
    const available = new Set(
      institutions
        .filter((item) => ['PILOT', 'ACTIVE'].includes(item.status))
        .filter((item) => parserCodes.has(item.code) && item.senderPatterns.some((pattern) => pattern.trim()))
        .map((item) => item.code)
    );
    const unavailable = normalized.filter((code) => !available.has(code));
    if (unavailable.length) {
      throw new AppError(400, 'BANK_SELECTION_UNAVAILABLE', `Unsupported bank selection: ${unavailable.join(', ')}.`);
    }
    return normalized;
  }

  public static async enabledCodes(inboxConnectionId: string) {
    const subscriptions = await prisma.inboxInstitutionSubscription.findMany({
      where: { inboxConnectionId, enabled: true },
      select: { institutionCode: true },
      orderBy: { institutionCode: 'asc' },
    });
    return subscriptions.map((item) => item.institutionCode);
  }

  public static async replace(workspaceId: string, inboxConnectionId: string, codes: string[]) {
    const normalized = await this.validate(codes);
    const connection = await prisma.inboxConnection.findFirst({
      where: { id: inboxConnectionId, workspaceId, provider: 'GOOGLE', status: { not: 'REVOKED' } },
      select: { id: true },
    });
    if (!connection) throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');

    const previous = await this.enabledCodes(inboxConnectionId);
    await prisma.$transaction([
      prisma.inboxInstitutionSubscription.updateMany({
        where: { inboxConnectionId, institutionCode: { notIn: normalized }, enabled: true },
        data: { enabled: false },
      }),
      ...normalized.map((institutionCode) => prisma.inboxInstitutionSubscription.upsert({
        where: { inboxConnectionId_institutionCode: { inboxConnectionId, institutionCode } },
        create: { inboxConnectionId, institutionCode, enabled: true },
        update: { enabled: true },
      })),
    ]);
    const previousSet = new Set(previous);
    return { selectedInstitutionCodes: normalized, addedInstitutionCodes: normalized.filter((code) => !previousSet.has(code)) };
  }
}
