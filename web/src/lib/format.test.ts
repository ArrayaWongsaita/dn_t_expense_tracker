import { describe, expect, it } from 'vitest'
import { formatAmount, formatThaiDate } from './format'

describe('formatAmount', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [12550, '125.50'],
    [125000, '1,250.00'],
    [999999999999, '9,999,999,999.99'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatAmount(cents)).toBe(expected)
  })
})

describe('formatThaiDate', () => {
  it.each([
    ['2026-11-22', '22 พ.ย. 2569'],
    ['2026-01-05', '5 ม.ค. 2569'],
    ['2000-12-31', '31 ธ.ค. 2543'],
  ])('formats %s as %s', (spentOn, expected) => {
    expect(formatThaiDate(spentOn)).toBe(expected)
  })
})
