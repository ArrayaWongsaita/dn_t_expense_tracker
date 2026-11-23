// แสดงผลล้วน ๆ ไม่มี state และไม่เรียก API จึงไม่ต้องมีเทสแยก —
// ตัวเลขที่ส่งเข้ามาถูกทดสอบแล้วใน lib/format.ts และ lib/expenses.ts
interface SummaryBarProps {
  total: string
  count: number
}

export function SummaryBar({ total, count }: SummaryBarProps) {
  return (
    <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3">
      <span className="text-sm text-neutral-500">รวม {count} รายการ</span>
      <span className="font-mono text-xl tabular-nums">{total}</span>
    </div>
  )
}
