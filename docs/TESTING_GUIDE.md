# คู่มือฝึกเขียนเทส (Testing Guide)

ยินดีต้อนรับ! คู่มือนี้พาคุณเขียนเทสครั้งแรกกับโปรเจกต์ Expense Tracker (Next.js + NestJS)
โดยไม่ต้องมีพื้นฐานเรื่องเทสมาก่อน

## เทสคืออะไร?

เทสคือโค้ดที่ **เรียกโค้ดของเรา แล้วเช็คว่าผลลัพธ์ตรงกับที่คาดไว้ไหม** ถ้าตรงเทสจะผ่าน ถ้าไม่ตรงเทสจะแจ้งว่าต่างกันตรงไหน
ทุกเทสในคู่มือนี้ใช้รูปแบบเดียวกัน 3 ขั้น: **Arrange** (เตรียมข้อมูล) → **Act** (เรียกสิ่งที่จะเทส) → **Assert** (เช็คผลด้วย `expect`)

## เตรียมเครื่อง

```bash
cd api && pnpm install
pnpm db:generate                        # สร้าง Prisma client (ไม่ต้องมี DB) ถ้าข้ามจะเจอ error หา '../generated/prisma/client.js' ไม่เจอ
cd ../web && pnpm install
pnpm exec playwright install chromium   # ดาวน์โหลดเบราว์เซอร์สำหรับบทที่ 5 (ทำครั้งเดียว)
```

ไม่ต้องติดตั้งหรือรันฐานข้อมูล (Postgres) เพื่อทำแบบฝึกหัดนี้

## ลำดับการฝึก (ทำทีละบท จากง่ายไปยาก)

ในแต่ละไฟล์ มี `it.todo(...)` ที่รอให้คุณเขียน และคอมเมนต์ `TODO(ผู้เรียน)` บอกว่าต้องเรียกอะไรและเช็คอะไร
เทสข้อแรกของแต่ละไฟล์เขียนไว้ให้แล้วเป็นตัวอย่าง: อ่านก่อน แล้วเขียนข้อถัดไปตามแบบเดียวกัน

| บท | ไฟล์ที่ต้องแก้ | เรียนรู้อะไร | คำสั่งรัน (โฟลเดอร์) |
|----|----------------|--------------|----------------------|
| 1 | `web/src/lib/expenses.test.ts` แล้วต่อด้วย `web/src/lib/format.test.ts` | `describe` / `it` / `expect` กับฟังก์ชันธรรมดา | `pnpm test` (`web`) |
| 2 | `api/src/expenses/expenses.service.spec.ts` | mock ด้วย `vi.fn()` และเทสกรณี error | `pnpm test` (`api`) |
| 3 | `web/src/components/ExpenseRow.test.tsx` | เทสคอมโพเนนต์ React ด้วย Testing Library | `pnpm test` (`web`) |
| 4 | `api/test/expenses.e2e-spec.ts` | ยิง HTTP เข้า API ด้วย supertest | `pnpm test:e2e` (`api`) |
| 5 | `web/e2e/expenses.spec.ts` | คุมเบราว์เซอร์ด้วย Playwright และ mock API ด้วย `page.route()` | `pnpm test:e2e` (`web`) |

ไฟล์ที่ **ไม่ต้องแก้** (เตรียมไว้ให้แล้ว แต่อ่านได้): `api/test/fakes/*`, `web/e2e/helpers.ts`

### เคล็ดลับ

- ใช้ `pnpm test:watch` เพื่อให้เทสรันซ้ำเองทุกครั้งที่บันทึกไฟล์
- เปลี่ยน `it.todo('...')` เป็น `it('...', () => { ... })` ทีละข้อ แล้วรันดู
- ทดลอง "ทำให้เทสพัง": แก้โค้ดจริงให้ผิดนิดหนึ่ง แล้วดูว่าเทสจับได้ไหม ถ้าไม่จับ แปลว่าเทสยังไม่แน่นพอ

## ติดขัด? ดูเฉลย

เฉลยทั้งหมดอยู่ที่ branch `solution`

```bash
git fetch origin solution                                       # ดึง branch เฉลยมาก่อน (ครั้งเดียว)
git diff HEAD origin/solution -- web/src/lib/expenses.test.ts   # ดูเฉพาะไฟล์ที่ติด
git show origin/solution:web/src/lib/expenses.test.ts           # ดูไฟล์เฉลยเต็ม
```

หรือเปิดดูบน GitHub โดยเลือก branch `solution` ลองเขียนเองก่อนแล้วค่อยเทียบ จะได้ประโยชน์มากกว่า

## ปัญหาที่พบบ่อย

- **Playwright บอกหา browser ไม่เจอ** → รัน `pnpm exec playwright install chromium` ในโฟลเดอร์ `web`
- **Playwright เปิด dev server ไม่ได้ / พอร์ต 3001 ถูกใช้อยู่** → ปิดโปรแกรมที่ใช้พอร์ตนั้นก่อน แล้วรันใหม่
- **`getByText` เจอหลายอัน / ไม่เจอ** → ลองใช้ `getByRole` พร้อมชื่อ หรือ `getByLabel` ให้เจาะจงขึ้น
- **เทส error ใช้ `await` แล้วยังไม่ผ่าน** → ต้องเขียน `await expect(promise).rejects.toThrow(...)` และมี `await` ข้างหน้าเสมอ

## ลองต่อยอด

- `toCents('')` หรือ `toCents('abc')` ควรได้อะไร? ลองรันแล้วคิดว่าพฤติกรรมนี้ถูกไหม
- เพิ่มเทส `update` ใน `ExpensesService` และ `PATCH /expenses/:id` ใน E2E
- เพิ่มเทสหน้าเว็บตอน API ตอบ error (ให้ `route.fulfill({ status: 500 })`) แล้วเช็คข้อความ error และปุ่ม "ลองใหม่"
- (ขั้นสูง) รัน E2E กับ Postgres จริงแทน repository ปลอม
