# Expense Tracker API

> **ถูกแทนที่แล้ว:** โครง auth และ layer ปัจจุบันดู `docs/superpowers/specs/2026-11-23-layered-refactor-design.md`

## เป้าหมาย

สร้าง REST API พื้นฐานสำหรับสมัครบัญชีด้วยอีเมลและรหัสผ่าน เข้าสู่ระบบ และจัดการรายจ่ายของตัวเอง ใช้โปรเจกต์ NestJS 12.6.0 แบบ ESM ที่มีอยู่ เชื่อม Prisma ORM 7 กับ PostgreSQL ในเครื่อง และทดสอบพฤติกรรมสำคัญผ่าน HTTP กับฐานข้อมูลจริง

ขอบเขตเวอร์ชันแรกคือสมัคร ล็อกอิน และเพิ่ม ดูรายการ ดูรายละเอียด แก้ไข และลบรายจ่าย โครงข้อมูลมี `User` กับ `Expense` และความสัมพันธ์หนึ่งต่อหลาย เป้าหมายด้านความเรียบง่ายคือให้ตามรอยคำขอจาก controller ไปถึงคำสั่ง Prisma ได้จากโมดูลที่รับผิดชอบฟีเจอร์นั้น

## แนวทางที่พิจารณา

| แนวทาง           | วิธีใช้งานและข้อแลกเปลี่ยน                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| JWT Bearer ที่เลือก | ล็อกอินแล้วส่ง access token อายุสั้นใน header ทุกครั้ง ใช้ curl และ Supertest ได้โดยตรง ฐานข้อมูลเก็บเฉพาะผู้ใช้และรายจ่าย เมื่อ token หมดอายุให้ล็อกอินใหม่ |
| Session cookie   | เบราว์เซอร์ส่ง cookie อัตโนมัติ และเซิร์ฟเวอร์ยกเลิก session ได้ทันที ต้องคงสถานะ session และกำหนดค่าการส่ง cookie                                 |

เลือก JWT Bearer ตามที่ผู้ใช้ยืนยัน เพื่อให้ REST API เรียกใช้และทดสอบได้ง่าย ใช้ `@nestjs/authentication` สำหรับ hash รหัสผ่าน ออก token และตรวจคำขอผ่าน guard ตั้งค่า access token อย่างเดียว. [NestJS Authentication](https://docs.nestjs.com/security/authentication#issue-tokens-to-the-mobile-app)

## สัญญา HTTP

| Method   | Path            | ผลลัพธ์เมื่อสำเร็จ                           |
| -------- | --------------- | --------------------------------------- |
| `POST`   | `/auth/signup`  | `201` พร้อม `{ id, email, createdAt }`   |
| `POST`   | `/auth/login`   | `200` พร้อม `{ accessToken, expiresIn }` |
| `POST`   | `/expenses`     | `201` พร้อมรายจ่ายที่สร้าง                   |
| `GET`    | `/expenses`     | `200` พร้อมอาร์เรย์รายจ่ายของผู้ใช้ปัจจุบัน       |
| `GET`    | `/expenses/:id` | `200` พร้อมรายจ่ายหนึ่งรายการ               |
| `PATCH`  | `/expenses/:id` | `200` พร้อมรายจ่ายหลังแก้ไข                 |
| `DELETE` | `/expenses/:id` | `204` พร้อม body ว่าง                     |

สมัครและล็อกอินรับ `{ email, password }` โดย trim และแปลงอีเมลเป็นตัวพิมพ์เล็กก่อนตรวจรูปแบบและค้นหา รหัสผ่านตอนสมัครยาว 12–128 ตัวอักษร ตอนล็อกอินยาว 1–128 ตัวอักษร ทั้งสองเส้นทางรักษาช่องว่างในรหัสผ่าน ตอบ `409` เมื่อ insert อีเมลซ้ำชน unique constraint ของ PostgreSQL (`P2002`) รวมถึงกรณีสมัครพร้อมกัน ล็อกอินตอบ `401` ด้วยข้อความเดียวกันเมื่ออีเมลหรือรหัสผ่านไม่ตรง. [Prisma Error Reference](https://www.prisma.io/docs/orm/v7/reference/error-reference#p2002)

Token อายุ 15 นาที โดย `expiresIn` ส่งเป็นวินาที ตั้ง signing key ผ่าน `JWT_SECRET` และกำหนด issuer กับ audience ของแอป เปิดให้เข้าถึงเส้นทางสมัครและล็อกอินได้โดยตรง ทุกเส้นทางรายจ่ายต้องมี `Authorization: Bearer <token>` และตอบ `401` เมื่อยืนยันตัวตนไม่สำเร็จ รหัสผ่านในฐานข้อมูลเก็บเป็น hash และผลลัพธ์สมัครระบุฟิลด์สาธารณะตามตาราง

### รายจ่าย

| ฟิลด์       | กติกา                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| `title`   | ข้อความหลัง trim ยาว 1–120 ตัวอักษร                                                         |
| `amount`  | ค่าเงิน THB แบบ JSON string เช่น `"125.50"` มีทศนิยมสองหลัก ช่วง `"0.01"` ถึง `"9999999999.99"` |
| `spentOn` | วันที่ตามปฏิทินแบบ `YYYY-MM-DD` ปี `0001` ถึง `9999` เช่น `"2026-11-22"`                        |
| `note`    | ข้อความหลัง trim ยาว 1–500 ตัวอักษรหรือ `null`                                               |

`POST` ต้องมี `title`, `amount` และ `spentOn` โดย `note` มีค่าเริ่มต้นเป็น `null` ส่วน `PATCH` ต้องส่งอย่างน้อยหนึ่งฟิลด์จากตาราง ใช้ `note: null` เพื่อล้างหมายเหตุ ผลลัพธ์รายจ่ายมี `id`, `title`, `amount`, `spentOn`, `note`, `createdAt` และ `updatedAt` ส่งจำนวนเงินเป็น string สองตำแหน่งและ timestamp เป็น ISO UTC

`GET /expenses` รองรับ `limit` ค่าเริ่มต้น 20 ช่วง 1–100 และ `offset` ค่าเริ่มต้น 0 รับจำนวนเต็มตั้งแต่ 0 ถึง 2,147,483,647 เรียง `spentOn` จากใหม่ไปเก่า แล้วใช้ `id` จากมากไปน้อยแก้กรณีวันที่ซ้ำ

Zod ตรวจ body, UUID และ query ผ่าน `StandardSchemaValidationPipe` โดยลงทะเบียน `APP_PIPE` เพื่อให้แอปและ e2e ใช้ชุดตรวจเดียวกัน ตอบ `400` เมื่อข้อมูลไม่ตรงสัญญา รวมถึงฟิลด์ที่เกินมา เช่น `userId` ใน body. [NestJS Validation](https://docs.nestjs.com/application/validation#schema-based-validation), [NestJS Pipes](https://docs.nestjs.com/pipes)

## โครงข้อมูลและการเข้าถึง

| Model     | โครงข้อมูล                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`    | `id` UUID, `email` ที่ผ่าน normalization และมี unique constraint, `passwordHash`, `createdAt`                                                                            |
| `Expense` | `id` UUID, `userId` foreign key, `title`, `amount` แบบ `Decimal @db.Decimal(12, 2)`, `spentOn` แบบ `DateTime @db.Date`, `note` nullable, `createdAt` และ `updatedAt` |

ใช้ index บน `(userId, spentOn, id)` สำหรับหน้ารายการ และเพิ่ม check constraint ให้จำนวนเงินเป็นบวก ส่งค่าเงินเข้า Prisma เป็น decimal string และจัดรูปผลลัพธ์จาก Decimal เป็นทศนิยมสองหลัก แปลง `spentOn` เป็น `Date` ที่เที่ยงคืน UTC ก่อนเขียน แล้วจัดรูปจากวันที่ UTC ตอนอ่านเพื่อรักษาวันเดิม. [Prisma PostgreSQL Date Mapping](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference#postgresql-6)

อ่าน ID ผู้ใช้จากบัญชีที่ guard ยืนยันแล้ว ใช้ ID นี้กำหนด `userId` ตอนสร้างและกรองหน้ารายการ ส่วนอ่านรายตัว แก้ไข และลบให้ Prisma ใช้ `{ id, userId }` ในคำสั่งเดียวกัน ตอบ `404` เมื่อการอ่านได้ `null` หรือคำสั่งแก้ไขและลบได้ `P2025` รวมถึงกรณี ID เป็นของบัญชีอื่น. [Prisma Permission Checks](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference#permission-checks), [Prisma Error Reference](https://www.prisma.io/docs/orm/v7/reference/error-reference#p2025)

## โครง NestJS และการรันในเครื่อง

ใช้ Express adapter จาก scaffold และ `@nestjs/config` โหลดค่าจาก environment โดยตรวจ `DATABASE_URL` และ `JWT_SECRET` ตอนเริ่มแอป. [NestJS Configuration](https://docs.nestjs.com/application/configuration)

- `AuthModule` ดูแลสมัคร ล็อกอิน และเชื่อม `@nestjs/authentication` เข้ากับการค้นหาผู้ใช้จาก Prisma
- `ExpensesModule` มี controller, Zod schemas และ service ที่ใช้ Prisma ทำ CRUD ตามบัญชี
- `PrismaModule` จัดการ Prisma client เพียงตัวเดียวและปิดการเชื่อมต่อเมื่อแอปปิด ใช้ `prisma-client` แบบ ESM สร้าง client ใต้ `src/generated/prisma` และเชื่อมด้วย `PrismaPg` จาก `@prisma/adapter-pg`. [Prisma 7 กับ NestJS](https://www.prisma.io/docs/guides/v7/frameworks/nestjs)

ใช้ PostgreSQL ที่มีอยู่ในเครื่องที่ `127.0.0.1:5432` บน instance เดียวกันโดยสร้างฐาน `expense_tracker` สำหรับพัฒนาและ `expense_tracker_test` สำหรับเทส ตัวแปร `DATABASE_URL` และ `TEST_DATABASE_URL` ใช้ host และ port เดียวกัน โดยระบุชื่อฐานของตัวเองใน URL. [PostgreSQL Managing Databases](https://www.postgresql.org/docs/current/managing-databases.html)

ใช้ Prisma CLI รุ่น 7 รัน `migrate dev` สำหรับสร้าง migration และ `prisma generate` สำหรับสร้าง client เป็นคนละขั้นตอน เก็บ migration SQL ใน Git ใช้ role ที่สร้างฐานข้อมูลได้เพื่อให้ `migrate dev` สร้าง shadow database ชั่วคราว. [Prisma CLI v7](https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference#migrate-dev), [Prisma Shadow Database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database#shadow-database-user-permissions)

ผู้ลงมือทำตรวจรุ่นของ PostgreSQL ที่มีอยู่และเลือกรุ่นย่อยของ Prisma 7 ที่ใช้ร่วมกับ runtime ในเครื่อง เขียน README ให้ตั้งค่าการเชื่อมต่อ เริ่มแอป รัน migration และรันเทสได้จาก checkout ใหม่ พร้อมตัวอย่างคำขอสมัคร ล็อกอิน และสร้างรายจ่าย

## กลยุทธ์การทดสอบ

ใช้ Vitest และ Supertest ที่โปรเจกต์มีอยู่ รัน `migrate deploy` หนึ่งครั้งก่อนเทสโดยใช้ `TEST_DATABASE_URL` เป็น `DATABASE_URL` ของทั้ง Prisma CLI และแอปทดสอบ ตรวจว่าค่านี้ชี้ฐาน `expense_tracker_test` ก่อนรัน migration เปิดแอปจริงจาก `AppModule` หนึ่งครั้งต่อชุด รัน e2e ตามลำดับ ลบเฉพาะข้อมูลของ fixture ตาม ID และปิดแอปเมื่อจบ. [NestJS Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing), [Prisma Integration Testing](https://www.prisma.io/docs/orm/v7/prisma-client/testing/integration-testing)

| พฤติกรรมหลัก     | สิ่งที่ตรวจ                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| สมัครและล็อกอิน   | สมัครได้ข้อมูลสาธารณะ ล็อกอินได้ token ที่เรียกหน้ารายการได้                            |
| อีเมลซ้ำ         | ส่งอีเมลคนละตัวพิมพ์ของบัญชีเดิมได้ `409`                                            |
| รหัสผ่านผิด       | ล็อกอินได้ `401`                                                               |
| คำขอไม่มี token  | เรียกหน้ารายจ่ายได้ `401`                                                       |
| จัดการรายจ่ายครบ | สร้างแล้วอ่านกลับได้จำนวนเงินและวันเดิม แก้ไขแล้วเห็นค่าใหม่ และอ่านหลังลบได้ `404`         |
| ข้อมูลไม่ถูกต้อง    | สร้างรายจ่ายด้วยจำนวนเงินเกินสองตำแหน่งได้ `400` และหน้ารายการยังว่าง                 |
| แยกข้อมูลบัญชี     | A เห็นเฉพาะของตัวเองและได้ `404` เมื่ออ่าน แก้ไข หรือลบของ B จากนั้น B อ่านรายการเดิมได้ |
| หน้ารายการ      | เรียงวันที่และ ID ตามสัญญา และ `limit` กับ `offset` ให้หน้าที่คาดไว้                   |

ใช้ `pnpm test` กับ unit test แบบตารางสำหรับค่าขอบของ schema จำนวนเงินและวันที่ เช่น ศูนย์ เกินช่วง และวันที่ 29 กุมภาพันธ์ ส่วน `pnpm test:e2e` ตรวจพฤติกรรม HTTP ในตารางโดยใช้ Prisma และ PostgreSQL จริง เทสทั้งสองชุดต้องรันซ้ำได้ และ `pnpm build` ต้องทำงานจาก client ที่ generate ใหม่
