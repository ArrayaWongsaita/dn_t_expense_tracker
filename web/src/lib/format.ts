const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

export function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatThaiDate(spentOn: string): string {
  const [year, month, day] = spentOn.split('-').map(Number)
  return `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`
}
