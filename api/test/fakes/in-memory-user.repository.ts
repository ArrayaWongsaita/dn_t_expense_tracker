// ============================================================
// ตัวปลอมแทน UserRepository (เก็บข้อมูลใน Map ในหน่วยความจำ แทนการใช้ DB)
// ============================================================
// ไฟล์นี้ "เตรียมไว้ให้แล้ว" ผู้เรียนไม่ต้องเขียนเอง
// มีเมธอดชื่อและรูปแบบการคืนค่าเหมือน UserRepository จริง
// เทสจึงสลับมาใช้ตัวนี้ได้ด้วย overrideProvider โดยโค้ดส่วนอื่นไม่รู้ตัว

import { randomUUID } from 'node:crypto';
import type {
  AuthenticatedUser,
  StoredUser,
} from '../../src/user/user.entity.js';

export class InMemoryUserRepository {
  // Map<id, user> — ข้อมูลจะหายเมื่อสร้าง instance ใหม่ (เทสแต่ละไฟล์เริ่มสะอาด)
  private readonly users = new Map<string, StoredUser>();

  findByEmail(email: string): Promise<StoredUser | null> {
    const user = [...this.users.values()].find((u) => u.email === email);
    return Promise.resolve(user ?? null);
  }

  findById(id: string): Promise<AuthenticatedUser | null> {
    const user = this.users.get(id);
    return Promise.resolve(user ? { id: user.id, email: user.email } : null);
  }

  // DB จริงคืน null เมื่อ email ซ้ำ (unique constraint) ตัวปลอมทำเหมือนกัน
  create(data: {
    email: string;
    passwordHash: string;
  }): Promise<StoredUser | null> {
    if ([...this.users.values()].some((u) => u.email === data.email)) {
      return Promise.resolve(null);
    }
    const user: StoredUser = { id: randomUUID(), createdAt: new Date(), ...data };
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }
}
