import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpensesRepository } from './expenses.repository.js';

const row = {
  id: 'expense-1',
  userId: 'user-1',
  title: 'Lunch',
  amount: new Prisma.Decimal('125.5'),
  spentOn: new Date('2026-11-22T00:00:00.000Z'),
  note: null,
  createdAt: new Date('2026-11-22T10:00:00.000Z'),
  updatedAt: new Date('2026-11-22T10:00:00.000Z'),
};

function createRepository() {
  const prisma = { expense: { findMany: vi.fn().mockResolvedValue([row]) } };
  return {
    repository: new ExpensesRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('ExpensesRepository', () => {
  it('returns amounts with two decimals', async () => {
    const { repository } = createRepository();

    const [expense] = await repository.findPage('user-1', {
      limit: 20,
      offset: 0,
    });

    expect(expense.amount).toBe('125.50');
  });

  it('lists only the given account, newest date first', async () => {
    const { repository, prisma } = createRepository();

    await repository.findPage('user-1', { limit: 5, offset: 10 });

    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ spentOn: 'desc' }, { id: 'desc' }],
      take: 5,
      skip: 10,
    });
  });
});
