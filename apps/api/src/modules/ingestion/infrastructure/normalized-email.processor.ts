import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { CreateTransactionSchema } from '../../../schemas/transaction.schema';
import { ParserRegistry } from '../../../ingestion/parser-registry';
import type { IngestionChannelName, NormalizedEmail } from '../../../ingestion/types';

interface ProcessEmailInput {
  workspaceId: string;
  email: NormalizedEmail;
  ingestionChannel: Extract<IngestionChannelName, 'GMAIL_OAUTH'>;
  institutionCode?: string;
  bankConnectionId?: string;
  inboxConnectionId?: string;
  sourceEmail?: string;
}

interface TransactionWriter {
  create(workspaceId: string, input: ReturnType<typeof CreateTransactionSchema.parse>): Promise<{ isDuplicate: boolean }>;
}

export class NormalizedEmailProcessor {
  public constructor(private readonly transactions: TransactionWriter) {}

  public async process(input: ProcessEmailInput) {
    const parser = input.institutionCode
      ? ParserRegistry.forInstitution(input.institutionCode)
      : ParserRegistry.detect(input.email);

    if (!parser) {
      return { status: 'ignored' as const, reason: 'PARSER_NOT_DETECTED' };
    }

    if (input.ingestionChannel === 'GMAIL_OAUTH') {
      if (!input.inboxConnectionId) {
        return { status: 'ignored' as const, reason: 'INBOX_CONNECTION_REQUIRED' };
      }
      const subscription = await prisma.inboxInstitutionSubscription.findUnique({
        where: {
          inboxConnectionId_institutionCode: {
            inboxConnectionId: input.inboxConnectionId,
            institutionCode: parser.institutionCode,
          },
        },
        select: { enabled: true },
      });
      if (!subscription?.enabled) {
        return {
          status: 'ignored' as const,
          reason: 'BANK_NOT_SELECTED',
          parserCode: parser.institutionCode,
          parserVersion: parser.version,
        };
      }
    }

    const parseResult = await parser.parse(input.email, {
      ingestionChannel: input.ingestionChannel,
    });
    if (parseResult.status !== 'parsed') {
      return { ...parseResult, parserCode: parser.institutionCode, parserVersion: parser.version };
    }

    const institution = await prisma.financialInstitution.findUnique({
      where: { code: parser.institutionCode },
    });
    if (!institution || !['PILOT', 'ACTIVE'].includes(institution.status)) {
      return {
        status: 'unsupported' as const,
        reason: 'INSTITUTION_NOT_AVAILABLE',
        parserCode: parser.institutionCode,
        parserVersion: parser.version,
      };
    }

    const bankConnection = input.bankConnectionId
      ? await prisma.bankConnection.findFirst({
          where: { id: input.bankConnectionId, workspaceId: input.workspaceId },
        })
      : await prisma.bankConnection.upsert({
          where: {
            workspaceId_institutionCode_ingestionChannel: {
              workspaceId: input.workspaceId,
              institutionCode: parser.institutionCode,
              ingestionChannel: input.ingestionChannel,
            },
          },
          create: {
            workspaceId: input.workspaceId,
            institutionCode: parser.institutionCode,
            ingestionChannel: input.ingestionChannel,
            inboxConnectionId: input.inboxConnectionId,
            sourceEmail: input.sourceEmail,
            sourceEmailVerified: input.ingestionChannel === 'GMAIL_OAUTH',
            status: 'VERIFYING',
          },
          update: {
            inboxConnectionId: input.inboxConnectionId,
            sourceEmail: input.sourceEmail,
            sourceEmailVerified: input.ingestionChannel === 'GMAIL_OAUTH',
          },
        });

    if (!bankConnection) {
      return {
        status: 'unsupported' as const,
        reason: 'BANK_CONNECTION_NOT_FOUND',
        parserCode: parser.institutionCode,
        parserVersion: parser.version,
      };
    }

    let created = 0;
    let duplicates = 0;
    let ignored = 0;
    for (const transaction of parseResult.transactions) {
      try {
        const validated = CreateTransactionSchema.parse({
          ...transaction,
          institutionCode: parser.institutionCode,
          ingestionChannel: input.ingestionChannel,
        });
        const result = await this.transactions.create(input.workspaceId, validated);
        if (result.isDuplicate) duplicates += 1;
        else created += 1;
      } catch (error) {
        if (error instanceof AppError && error.code === 'INCOME_MANUAL_ENTRY_DISABLED') {
          ignored += 1;
          continue;
        }
        throw error;
      }
    }

    if (created === 0 && duplicates === 0 && ignored > 0) {
      return {
        status: 'ignored' as const,
        reason: 'INCOME_MOVEMENT_IGNORED',
        parserCode: parser.institutionCode,
        parserVersion: parser.version,
      };
    }

    await prisma.bankConnection.update({
      where: { id: bankConnection.id },
      data: { status: 'ACTIVE', lastEventAt: new Date(), lastErrorCode: null },
    });

    return {
      status: 'parsed' as const,
      parserCode: parser.institutionCode,
      parserVersion: parser.version,
      bankConnectionId: bankConnection.id,
      created,
      duplicates,
    };
  }
}
