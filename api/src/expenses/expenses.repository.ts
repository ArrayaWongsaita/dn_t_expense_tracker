import { Injectable } from '@nestjs/common';
import { Prisma, type Expense } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ExpenseRecord } from './expense.entity.js';

function toExpenseRecord(expense: Expense): ExpenseRecord {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount.toFixed(2),
    spentOn: expense.spentOn,
    note: expense.note,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(
    userId: string,
    page: { limit: number; offset: number },
  ): Promise<ExpenseRecord[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      orderBy: [{ spentOn: 'desc' }, { id: 'desc' }],
      take: page.limit,
      skip: page.offset,
    });
    return expenses.map(toExpenseRecord);
  }

  async create(
    userId: string,
    data: {
      title: string;
      amount: string;
      spentOn: Date;
      note: string | null;
    },
  ): Promise<ExpenseRecord> {
    const expense = await this.prisma.expense.create({
      data: { ...data, userId },
    });
    return toExpenseRecord(expense);
  }

  async findOne(userId: string, id: string): Promise<ExpenseRecord | null> {
    const expense = await this.prisma.expense.findUnique({
      where: { id, userId },
    });
    return expense === null ? null : toExpenseRecord(expense);
  }

  async update(
    userId: string,
    id: string,
    changes: {
      title?: string;
      amount?: string;
      spentOn?: Date;
      note?: string | null;
    },
  ): Promise<ExpenseRecord | null> {
    try {
      const expense = await this.prisma.expense.update({
        where: { id, userId },
        data: changes,
      });
      return toExpenseRecord(expense);
    } catch (error) {
      if (isMissingRow(error)) {
        return null;
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<boolean> {
    try {
      await this.prisma.expense.delete({ where: { id, userId } });
      return true;
    } catch (error) {
      if (isMissingRow(error)) {
        return false;
      }
      throw error;
    }
  }
}

function isMissingRow(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}
