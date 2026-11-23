import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExpensesRepository } from './expenses.repository.js';
import { ExpensesService } from './expenses.service.js';

const record = {
  id: 'expense-1',
  title: 'Lunch',
  amount: '125.50',
  spentOn: new Date('2026-11-22T00:00:00.000Z'),
  note: 'receipt',
  createdAt: new Date('2026-11-22T10:00:00.000Z'),
  updatedAt: new Date('2026-11-22T10:00:00.000Z'),
};

const response = {
  id: 'expense-1',
  title: 'Lunch',
  amount: '125.50',
  spentOn: '2026-11-22',
  note: 'receipt',
  createdAt: '2026-11-22T10:00:00.000Z',
  updatedAt: '2026-11-22T10:00:00.000Z',
};

function createFakes() {
  return {
    findPage: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

async function createService(fakes: ReturnType<typeof createFakes>) {
  const module = await Test.createTestingModule({
    providers: [ExpensesService],
  })
    .useMocker((token) => (token === ExpensesRepository ? fakes : undefined))
    .compile();
  return module.get(ExpensesService);
}

describe('ExpensesService', () => {
  it('maps stored records to the wire shape', async () => {
    const fakes = createFakes();
    fakes.findPage.mockResolvedValue([record]);
    const service = await createService(fakes);

    await expect(
      service.list('user-1', { limit: 20, offset: 0 }),
    ).resolves.toEqual([response]);
  });

  it('sends spentOn to the repository as UTC midnight', async () => {
    const fakes = createFakes();
    fakes.create.mockResolvedValue(record);
    const service = await createService(fakes);

    await service.create('user-1', {
      title: 'Lunch',
      amount: '125.50',
      spentOn: '2026-11-22',
      note: 'receipt',
    });

    expect(fakes.create).toHaveBeenCalledWith('user-1', {
      title: 'Lunch',
      amount: '125.50',
      spentOn: new Date('2026-11-22T00:00:00.000Z'),
      note: 'receipt',
    });
  });

  it('keeps an explicit null note when patching', async () => {
    const fakes = createFakes();
    fakes.update.mockResolvedValue({ ...record, note: null });
    const service = await createService(fakes);

    await service.update('user-1', 'expense-1', { note: null });

    expect(fakes.update).toHaveBeenCalledWith('user-1', 'expense-1', {
      note: null,
    });
  });

  it('raises not found when the expense does not exist', async () => {
    const fakes = createFakes();
    fakes.findOne.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(service.get('user-1', 'missing')).rejects.toThrow(
      new NotFoundException('Expense not found'),
    );
  });

  it('raises not found when a patch matches no row', async () => {
    const fakes = createFakes();
    fakes.update.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(
      service.update('user-1', 'missing', { title: 'Changed' }),
    ).rejects.toThrow(new NotFoundException('Expense not found'));
  });

  it('raises not found when a delete matches no row', async () => {
    const fakes = createFakes();
    fakes.remove.mockResolvedValue(false);
    const service = await createService(fakes);

    await expect(service.remove('user-1', 'missing')).rejects.toThrow(
      new NotFoundException('Expense not found'),
    );
  });
});
