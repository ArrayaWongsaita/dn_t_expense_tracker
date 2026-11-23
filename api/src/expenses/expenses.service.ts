import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExpenseRecord, ExpenseResponse } from './expense.entity.js';
import { ExpensesRepository } from './expenses.repository.js';
import type { CreateExpenseDto } from './dto/create-expense.dto.js';
import type { ListExpensesDto } from './dto/list-expenses.dto.js';
import type { UpdateExpenseDto } from './dto/update-expense.dto.js';

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toExpenseResponse(record: ExpenseRecord): ExpenseResponse {
  return {
    id: record.id,
    title: record.title,
    amount: record.amount,
    spentOn: record.spentOn.toISOString().slice(0, 10),
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class ExpensesService {
  constructor(private readonly expenses: ExpensesRepository) {}

  async list(
    userId: string,
    { limit, offset }: ListExpensesDto,
  ): Promise<ExpenseResponse[]> {
    const records = await this.expenses.findPage(userId, { limit, offset });
    return records.map(toExpenseResponse);
  }

  async create(
    userId: string,
    { spentOn, ...input }: CreateExpenseDto,
  ): Promise<ExpenseResponse> {
    const record = await this.expenses.create(userId, {
      ...input,
      spentOn: toUtcDate(spentOn),
    });
    return toExpenseResponse(record);
  }

  async get(userId: string, id: string): Promise<ExpenseResponse> {
    const record = await this.expenses.findOne(userId, id);
    if (record === null) {
      throw new NotFoundException('Expense not found');
    }
    return toExpenseResponse(record);
  }

  async update(
    userId: string,
    id: string,
    { spentOn, ...changes }: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    const record = await this.expenses.update(userId, id, {
      ...changes,
      spentOn: spentOn === undefined ? undefined : toUtcDate(spentOn),
    });
    if (record === null) {
      throw new NotFoundException('Expense not found');
    }
    return toExpenseResponse(record);
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.expenses.remove(userId, id);
    if (!removed) {
      throw new NotFoundException('Expense not found');
    }
  }
}
