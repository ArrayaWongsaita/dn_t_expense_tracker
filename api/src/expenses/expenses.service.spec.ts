// ============================================================
// บทที่ 2: Unit test ของ ExpensesService (ฝั่ง NestJS)
// ============================================================
// ExpensesService ต้องพึ่ง ExpensesRepository (ตัวคุยกับ DB)
// แต่เทสนี้ "ไม่อยากใช้ DB จริง" จึงสร้างของปลอม (mock) มาแทน
//
// mock คืออะไร? คือ object ที่ทำท่าเป็น repository แต่เราควบคุมได้เองว่าจะคืนอะไร
//   vi.fn()                    → ฟังก์ชันปลอมที่จำได้ว่าถูกเรียกด้วยอะไรบ้าง
//   .mockResolvedValue(x)      → ทำให้ฟังก์ชันปลอม "คืน Promise ที่ resolve เป็น x"
//   expect(fn).toHaveBeenCalledWith(...) → เช็คว่าถูกเรียกด้วยค่าที่ถูกต้อง
//
// เทสนี้สร้าง service ด้วย new โดยตรง ไม่ต้องใช้ Nest testing module ให้ซับซ้อน
//
// รันเทส:  pnpm test

import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExpenseRecord } from './expense.entity.js';
import type { ExpensesRepository } from './expenses.repository.js';
import { ExpensesService } from './expenses.service.js';

// รายจ่ายตัวอย่างที่ "repository ปลอม" จะคืนให้
// สังเกต: spentOn/createdAt เป็น Date เพราะ repository คืนแบบนี้ ส่วน service จะแปลงเป็น string
const record: ExpenseRecord = {
  id: 'expense-1',
  title: 'Lunch',
  amount: '125.50',
  spentOn: new Date('2026-11-22T00:00:00.000Z'),
  note: null,
  createdAt: new Date('2026-11-22T03:00:00.000Z'),
  updatedAt: new Date('2026-11-22T03:00:00.000Z'),
};

describe('ExpensesService', () => {
  // ตัวแปรที่ใช้ร่วมกันในทุกเทส
  let repository: {
    findPage: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let service: ExpensesService;

  // beforeEach = รัน "ก่อนทุกเทส" เพื่อให้ทุกเทสเริ่มจากสถานะสะอาด ไม่ปนกัน
  beforeEach(() => {
    repository = {
      findPage: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    };
    // `as unknown as ExpensesRepository` = บอก TypeScript ว่า "เชื่อเถอะ ของปลอมนี้ใช้แทนได้"
    service = new ExpensesService(repository as unknown as ExpensesRepository);
  });

  it('list converts records into API responses', async () => {
    // Arrange: repository ปลอมคืนรายจ่าย 1 รายการ
    repository.findPage.mockResolvedValue([record]);

    // Act
    const result = await service.list('user-1', { limit: 20, offset: 0 });

    // Assert: Date ถูกแปลงเป็น string ตามรูปแบบที่ API ตอบกลับ
    expect(result).toEqual([
      {
        id: 'expense-1',
        title: 'Lunch',
        amount: '125.50',
        spentOn: '2026-11-22',
        note: null,
        createdAt: '2026-11-22T03:00:00.000Z',
        updatedAt: '2026-11-22T03:00:00.000Z',
      },
    ]);
  });

  it('list asks the repository for the right user and page', async () => {
    repository.findPage.mockResolvedValue([]);

    await service.list('user-1', { limit: 10, offset: 30 });

    // เช็คว่า service ส่งต่อ userId และ limit/offset ให้ repository ถูกต้อง
    expect(repository.findPage).toHaveBeenCalledWith('user-1', {
      limit: 10,
      offset: 30,
    });
  });

  it('get returns the expense when it exists', async () => {
    repository.findOne.mockResolvedValue(record);

    const result = await service.get('user-1', 'expense-1');

    expect(result.id).toBe('expense-1');
    expect(repository.findOne).toHaveBeenCalledWith('user-1', 'expense-1');
  });

  it('get throws NotFoundException when the expense does not exist', async () => {
    // repository คืน null = ไม่เจอรายการ
    repository.findOne.mockResolvedValue(null);

    // เทส "error" ต้องใช้ rejects.toThrow เพราะ service เป็น async
    // (ต้องมี await ข้างหน้า expect ด้วย ไม่งั้นเทสจะผ่านโดยไม่ได้เช็คจริง)
    await expect(service.get('user-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create sends the date to the repository as UTC midnight', async () => {
    repository.create.mockResolvedValue(record);

    await service.create('user-1', {
      title: 'Lunch',
      amount: '125.50',
      spentOn: '2026-11-22',
      note: null,
    });

    // service แปลง '2026-11-22' (string) เป็น Date ที่เวลา 00:00 UTC ก่อนส่งให้ repository
    expect(repository.create).toHaveBeenCalledWith('user-1', {
      title: 'Lunch',
      amount: '125.50',
      spentOn: new Date('2026-11-22T00:00:00.000Z'),
      note: null,
    });
  });

  it('remove throws NotFoundException when nothing was deleted', async () => {
    // repository.remove คืน false = ไม่มีอะไรถูกลบ
    repository.remove.mockResolvedValue(false);

    await expect(service.remove('user-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
