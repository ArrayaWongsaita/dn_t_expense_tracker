// ============================================================
// ตัวปลอมแทน ExpensesRepository (เก็บใน Map แทนการใช้ DB)
// ============================================================
// ไฟล์นี้ "เตรียมไว้ให้แล้ว" ผู้เรียนไม่ต้องเขียนเอง
// สังเกตว่าทุกเมธอดกรองด้วย userId เหมือนของจริง
// ผู้ใช้คนหนึ่งจึงมองไม่เห็นรายจ่ายของอีกคน (มีเทสเช็คเรื่องนี้ในบทที่ 4)

import { randomUUID } from 'node:crypto';
import type { ExpenseRecord } from '../../src/expenses/expense.entity.js';

interface StoredExpense extends ExpenseRecord {
  userId: string;
}

export class InMemoryExpensesRepository {
  private readonly expenses = new Map<string, StoredExpense>();

  findPage(
    userId: string,
    page: { limit: number; offset: number },
  ): Promise<ExpenseRecord[]> {
    const mine = [...this.expenses.values()]
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.spentOn.getTime() - a.spentOn.getTime());
    return Promise.resolve(mine.slice(page.offset, page.offset + page.limit));
  }

  create(
    userId: string,
    data: { title: string; amount: string; spentOn: Date; note: string | null },
  ): Promise<ExpenseRecord> {
    const now = new Date();
    const expense: StoredExpense = {
      id: randomUUID(),
      userId,
      ...data,
      // DB จริงเก็บเงินเป็นทศนิยม 2 ตำแหน่งเสมอ จึงทำให้เหมือนกัน
      amount: Number(data.amount).toFixed(2),
      createdAt: now,
      updatedAt: now,
    };
    this.expenses.set(expense.id, expense);
    return Promise.resolve(expense);
  }

  findOne(userId: string, id: string): Promise<ExpenseRecord | null> {
    const expense = this.expenses.get(id);
    return Promise.resolve(expense?.userId === userId ? expense : null);
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
    const expense = await this.findOne(userId, id);
    if (expense === null) return null;
    const updated: StoredExpense = {
      ...(expense as StoredExpense),
      ...Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      ),
      updatedAt: new Date(),
    };
    this.expenses.set(id, updated);
    return updated;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    if ((await this.findOne(userId, id)) === null) return false;
    this.expenses.delete(id);
    return true;
  }
}
