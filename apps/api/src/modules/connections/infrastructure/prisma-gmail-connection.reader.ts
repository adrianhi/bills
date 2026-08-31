import { prisma } from '../../../config/database';

function serializeConnection<T extends Record<string, unknown>>(connection: T): Record<string, unknown> {
  const { encryptedAccessToken: _accessToken, encryptedRefreshToken: _refreshToken, ...safe } = connection;
  return safe;
}

export class PrismaGmailConnectionReader {
  public async list(workspaceId: string): Promise<Array<Record<string, unknown>>> {
    const connections = await prisma.inboxConnection.findMany({
      where: { workspaceId },
      include: {
        institutionSubscriptions: {
          where: { enabled: true },
          select: { institutionCode: true },
          orderBy: { institutionCode: 'asc' },
        },
        bankConnections: {
          select: {
            id: true,
            institutionCode: true,
            status: true,
            lastEventAt: true,
            institution: { select: { displayName: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(connections.map(async (connection) => {
      const [currentJob, failedEvents] = await Promise.all([
        prisma.ingestionJob.findFirst({
          where: { inboxConnectionId: connection.id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, type: true, status: true, attempts: true, maxAttempts: true,
            errorCode: true, errorMessage: true, createdAt: true, startedAt: true, processedAt: true,
          },
        }),
        prisma.ingestionEvent.count({
          where: { inboxConnectionId: connection.id, provider: 'GOOGLE_GMAIL', status: 'FAILED' },
        }),
      ]);
      const selectedInstitutionCodes = connection.institutionSubscriptions.map((item) => item.institutionCode);
      const { institutionSubscriptions: _subscriptions, ...connectionData } = connection;
      return serializeConnection({
        ...connectionData,
        selectedInstitutionCodes,
        requiresBankSelection: selectedInstitutionCodes.length === 0,
        currentJob,
        failedEvents,
      });
    }));
  }
}

export { serializeConnection };
