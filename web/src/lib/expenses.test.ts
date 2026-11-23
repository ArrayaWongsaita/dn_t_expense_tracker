import { describe, expect, it } from 'vitest'
import { filterByMonth, monthKey, monthOf, sumCents, toCents } from './expenses'
import type { Expense } from './types'

function makeExpense(spentOn: string, amount: string): Expense {
  return {
    id: `${spentOn}-${amount}`,
    title: 'x',
    amount,
    spentOn,
    note: null,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  }
}

describe('monthKey', () => {
  it.each([
    ['2026-11-22', '2026-11'],
    ['2026-01-01', '2026-01'],
  ])('takes the month out of %s', (spentOn, expected) => {
    expect(monthKey(spentOn)).toBe(expected)
  })
})

describe('filterByMonth', () => {
  const list = [
    makeExpense('2026-10-31', '1.00'),
    makeExpense('2026-11-01', '2.00'),
    makeExpense('2026-11-30', '3.00'),
  ]

  it.each([
    ['2026-11', 2],
    ['2026-10', 1],
    ['2025-01', 0],
  ])('keeps only expenses in %s', (month, expected) => {
    expect(filterByMonth(list, month)).toHaveLength(expected)
  })
})

describe('toCents', () => {
  it.each([
    ['0.05', 5],
    ['125.50', 12550],
    ['9999999999.99', 999999999999],
  ])('turns %s into %i cents', (amount, expected) => {
    expect(toCents(amount)).toBe(expected)
  })
})

describe('sumCents', () => {
  it('adds cents without floating point drift', () => {
    const list = [makeExpense('2026-11-01', '0.10'), makeExpense('2026-11-02', '0.20')]
    expect(sumCents(list)).toBe(30)
  })

  it('returns 0 for an empty list', () => {
    expect(sumCents([])).toBe(0)
  })
})

describe('monthOf', () => {
  it.each([
    [new Date(2026, 0, 5), '2026-01'],
    [new Date(2026, 11, 31), '2026-12'],
    [new Date(2026, 10, 1, 3, 0), '2026-11'],
  ])('takes the local calendar month of the date', (date, expected) => {
    expect(monthOf(date)).toBe(expected)
  })
})
