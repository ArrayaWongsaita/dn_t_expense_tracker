import { createExpenseSchema } from './create-expense.dto.js';
import { listExpensesSchema } from './list-expenses.dto.js';

const validExpense = {
  title: 'Lunch',
  amount: '125.50',
  spentOn: '2026-11-22',
};

describe('expense input', () => {
  it.each([
    ['0.01', true],
    ['9999999999.99', true],
    ['0.00', false],
    ['-1.00', false],
    ['1.234', false],
    ['10000000000.00', false],
    [125.5, false],
  ])('validates amount %j', (amount, valid) => {
    expect(
      createExpenseSchema.safeParse({ ...validExpense, amount }).success,
    ).toBe(valid);
  });

  it.each([
    ['2024-02-29', true],
    ['0001-01-01', true],
    ['2025-02-29', false],
    ['0000-01-01', false],
    ['2026-11-22T00:00:00Z', false],
  ])('validates date %j', (spentOn, valid) => {
    expect(
      createExpenseSchema.safeParse({ ...validExpense, spentOn }).success,
    ).toBe(valid);
  });

  it.each([
    [{ limit: '5', offset: '0' }, true],
    [{}, true],
    [{ limit: ['1', '2'] }, false],
    [{ offset: '' }, false],
    [{ limit: '101' }, false],
    [{ offset: '-1' }, false],
  ])('validates list query %j', (query, valid) => {
    expect(listExpensesSchema.safeParse(query).success).toBe(valid);
  });
});
