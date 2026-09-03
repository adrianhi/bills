import { prisma } from '../../../config/database';
import type { CreateIncomeStreamInput, UpdateIncomeStreamInput } from '@bills/contracts';
import type { IncomeRepository } from '../application/income.ports';

export class PrismaIncomeRepository implements IncomeRepository {
  public async listByWorkspace(workspaceId: string) {
    const streams = await prisma.incomeStream.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return streams.map((s) => ({
      id: s.id,
      name: s.name,
      amount: Number(s.amount),
      currency: s.currency,
      frequency: s.frequency,
      dayOfMonth: s.dayOfMonth,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  public async getById(workspaceId: string, id: string) {
    const stream = await prisma.incomeStream.findFirst({
      where: { id, workspaceId },
    });
    if (!stream) return null;

    return {
      id: stream.id,
      name: stream.name,
      amount: Number(stream.amount),
      currency: stream.currency,
      frequency: stream.frequency,
      dayOfMonth: stream.dayOfMonth,
      isActive: stream.isActive,
      createdAt: stream.createdAt.toISOString(),
      updatedAt: stream.updatedAt.toISOString(),
    };
  }

  public async create(workspaceId: string, input: CreateIncomeStreamInput) {
    const created = await prisma.incomeStream.create({
      data: {
        workspaceId,
        name: input.name,
        amount: input.amount,
        currency: input.currency || 'DOP',
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
      },
    });

    return {
      id: created.id,
      name: created.name,
      amount: Number(created.amount),
      currency: created.currency,
      frequency: created.frequency,
      dayOfMonth: created.dayOfMonth,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  public async update(workspaceId: string, id: string, input: UpdateIncomeStreamInput) {
    const existing = await prisma.incomeStream.findFirst({ where: { id, workspaceId } });
    if (!existing) return null;

    const updated = await prisma.incomeStream.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.dayOfMonth !== undefined ? { dayOfMonth: input.dayOfMonth } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      amount: Number(updated.amount),
      currency: updated.currency,
      frequency: updated.frequency,
      dayOfMonth: updated.dayOfMonth,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public async delete(workspaceId: string, id: string): Promise<boolean> {
    const existing = await prisma.incomeStream.findFirst({ where: { id, workspaceId } });
    if (!existing) return false;

    await prisma.incomeStream.delete({ where: { id } });
    return true;
  }
}
