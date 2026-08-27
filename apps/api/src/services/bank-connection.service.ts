import crypto from 'crypto';
import { prisma } from '../config/database';
import { config } from '../config';
import { AppError } from '../errors/app-error';

export class BankConnectionService {
  public static listInstitutions() {
    return prisma.financialInstitution.findMany({ orderBy: [{ status: 'asc' }, { displayName: 'asc' }] });
  }

  public static list(workspaceId: string) {
    return prisma.bankConnection.findMany({
      where: { workspaceId },
      include: { institution: true, ingestionAddress: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  public static async create(workspaceId: string, institutionCode: string, sourceEmail?: string) {
    if (!config.resendReceivingDomain) {
      throw new AppError(503, 'INBOUND_NOT_CONFIGURED', 'Inbound email is not configured.');
    }

    const code = institutionCode.trim().toUpperCase();
    const institution = await prisma.financialInstitution.findUnique({ where: { code } });
    if (!institution || !['PILOT', 'ACTIVE'].includes(institution.status)) {
      throw new AppError(400, 'INSTITUTION_NOT_AVAILABLE', 'This institution is not available yet.');
    }

    const existing = await prisma.bankConnection.findFirst({
      where: { workspaceId, institutionCode: code, ingestionChannel: 'EMAIL_FORWARD' },
      include: { institution: true, ingestionAddress: true },
    });
    if (existing) {
      if (sourceEmail && existing.sourceEmail !== sourceEmail.trim().toLowerCase()) {
        return prisma.bankConnection.update({
          where: { id: existing.id },
          data: { sourceEmail: sourceEmail.trim().toLowerCase() },
          include: { institution: true, ingestionAddress: true },
        });
      }
      return existing;
    }

    const localPart = `${code.toLowerCase()}-${crypto.randomBytes(18).toString('base64url').toLowerCase()}`;
    return prisma.bankConnection.create({
      data: {
        workspaceId,
        institutionCode: code,
        sourceEmail: sourceEmail?.trim().toLowerCase() || null,
        status: 'PENDING',
        ingestionAddress: {
          create: { aliasToken: localPart, domain: config.resendReceivingDomain },
        },
      },
      include: { institution: true, ingestionAddress: true },
    });
  }

  public static async rotateAddress(workspaceId: string, connectionId: string) {
    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, workspaceId },
      include: { ingestionAddress: true },
    });
    if (!connection) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Bank connection not found.');
    if (!config.resendReceivingDomain) {
      throw new AppError(503, 'INBOUND_NOT_CONFIGURED', 'Inbound email is not configured.');
    }

    const localPart = `${connection.institutionCode.toLowerCase()}-${crypto.randomBytes(18).toString('base64url').toLowerCase()}`;
    const address = connection.ingestionAddress
      ? await prisma.ingestionAddress.update({
          where: { bankConnectionId: connection.id },
          data: {
            aliasToken: localPart,
            domain: config.resendReceivingDomain,
            isActive: true,
            rotatedAt: new Date(),
          },
        })
      : await prisma.ingestionAddress.create({
          data: {
            bankConnectionId: connection.id,
            aliasToken: localPart,
            domain: config.resendReceivingDomain,
          },
        });
    return address;
  }

  public static async remove(workspaceId: string, connectionId: string) {
    const result = await prisma.bankConnection.deleteMany({ where: { id: connectionId, workspaceId } });
    if (result.count === 0) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Bank connection not found.');
  }
}
