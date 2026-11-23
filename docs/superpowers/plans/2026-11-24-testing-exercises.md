# Testing Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every existing test with five beginner lessons (Vitest, supertest, Playwright), publish the complete passing set on branch `solution`, and leave a commented skeleton plus a Thai guide on `main`.

**Architecture:** Work on `solution` first (tooling → five lessons → guide), push it, then branch the skeleton off it onto `main` by stripping test bodies into `it.todo` + hint comments. Product code is untouched.

**Tech Stack:** Vitest, @nestjs/testing, supertest, @testing-library/react + user-event, Playwright (chromium), pnpm.

**Spec:** `docs/superpowers/specs/2026-11-24-testing-exercises-design.md`

## Global Constraints

- Comments in tests, fakes, helpers and guide are Thai; identifiers/code English.
- Do not change product behaviour. Only test files, test config, dev-deps, scripts, docs. (Sole exception: add a `data-testid` if a Playwright locator truly cannot be done by role/label/text.)
- api tests must not need Postgres or a real `.env` (tests stub env themselves).
- Vitest major version identical in `api/` and `web/`; verify current versions/docs (Playwright `webServer`, `page.route`, Vitest, Nest `overrideProvider`) before pinning.
- Each test file ≤ ~8 tests, one idea per test, Arrange/Act/Assert comments.
- Web dev server port is 3001 (`pnpm dev`); API default 3000.
- Skeleton tests use `it.todo('<title>')` plus a Thai hint comment saying what to call and assert.
- Old test files to delete: all `api/src/**/*.spec.ts`, `api/test/app.e2e-spec.ts`, `api/scripts/test-e2e.mjs`, all `web/src/**/*.test.ts(x)`.

## Review Focus

- `toCents('')`/non-numeric → NaN; lesson must not pin NaN as intended behaviour (skip, mention in guide as "ลองคิดดู").
- `filterByMonth` with empty list → `[]` (Task 2).
- Service `get` for another user's/unknown id → `NotFoundException`, not `null` (Task 3).
- API request without/with garbage bearer token → 401 (Task 5).
- Expense of user A not visible/deletable by user B → 404 (Task 5).
- Playwright test leaking state between tests (route handlers/cookie) → each test registers its own routes and cookie (Task 6).

---

### Task 1: Branch, cleanup and tooling

**Files:**
- Delete: old tests listed in Global Constraints
- Modify: `api/package.json`, `api/vitest.config.ts`, `api/vitest.config.e2e.ts`, `web/package.json`, `web/vitest.config.mts`, `web/.gitignore`
- Create: `web/playwright.config.ts`, `web/e2e/.gitkeep`

**Interfaces:**
- Produces: scripts `api: test`, `api: test:e2e` (= `vitest run --config vitest.config.e2e.ts`), `web: test`, `web: test:e2e` (= `playwright test`).

- [ ] **Step 1:** `git checkout -b solution`; `git rm` the old tests and `api/scripts/test-e2e.mjs`; commit "chore: remove old tests".
- [ ] **Step 2:** Align `vitest` to the same major in both packages (use the newest that supports Vite 8 / Next 16); `pnpm install` in both.
- [ ] **Step 3:** In `web`, install `@playwright/test`, run `pnpm exec playwright install chromium`. Add `web/playwright.config.ts`: `testDir: './e2e'`, chromium only, `use.baseURL: 'http://127.0.0.1:3001'`, `webServer: { command: 'pnpm dev', url: 'http://127.0.0.1:3001', reuseExistingServer: true }`. Exclude `e2e/**` and `**/node_modules/**` from Vitest (`test.exclude`). Add Playwright artefact dirs to `web/.gitignore`.
- [ ] **Step 4:** Update `api` `test:e2e` script; `api/vitest.config.e2e.ts` keeps `include: ['**/*.e2e-spec.ts']`.
- [ ] **Step 5:** Run `pnpm test` in api and web. Expected: "No test files found" exits non-zero → set `passWithNoTests: true` in both configs, rerun, expect exit 0.
- [ ] **Step 6:** Commit "chore: set up test tooling".

### Task 2: Lesson 1 — web pure functions

**Files:**
- Create: `web/src/lib/expenses.test.ts`, `web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: `toCents(amount: string): number`, `sumCents(expenses: Expense[]): number`, `filterByMonth(expenses, month): Expense[]`, `monthKey`, `formatAmount(cents: number): string`, `formatThaiDate(spentOn: string): string`, `Expense` type from `src/lib/types.ts`.

- [ ] **Step 1:** Write `expenses.test.ts` with a header comment explaining `describe / it / expect` and AAA. Tests: `toCents('10.50')` → 1050; `toCents('0.1')+toCents('0.2')` equals 30 (why cents); `sumCents([])` → 0; `sumCents` of two expenses (`'10.50'`,`'4.25'`) → 1475; `filterByMonth` keeps only `'2026-11'` rows; `filterByMonth([], '2026-11')` → `[]`. Use a small `makeExpense(overrides)` helper in the file.
- [ ] **Step 2:** Write `format.test.ts`: `formatAmount(12550)` → `'125.50'`-style Thai locale string (assert actual output of the runtime; comment why 2 decimals); `formatThaiDate('2026-11-22')` → `'22 พ.ย. 2569'`; `formatThaiDate('2026-01-01')` → `'1 ม.ค. 2569'`.
- [ ] **Step 3:** `cd web && pnpm test` → all pass. Mutation check: temporarily change `toCents` to `Math.floor` and confirm a test fails, then revert.
- [ ] **Step 4:** Commit "test(web): lesson 1 pure function tests".

### Task 3: Lesson 2 — ExpensesService with mocked repository

**Files:**
- Create: `api/src/expenses/expenses.service.spec.ts`

**Interfaces:**
- Consumes: `ExpensesService` (constructor takes `ExpensesRepository`); repo methods `findPage(userId, {limit, offset})`, `findOne(userId, id)`, `create(userId, data)`, `remove(userId, id): Promise<boolean>`; `ExpenseRecord` from `expense.entity.ts`.

- [ ] **Step 1:** Write spec constructing the service directly with a hand-made mock object of `vi.fn()` (no Nest testing module — keeps it simple); comment what a mock is and why. Tests: `list` returns records with `spentOn` as `'YYYY-MM-DD'` string and dates as ISO strings; `list` passes `userId`, `limit`, `offset` to `findPage` (`toHaveBeenCalledWith`); `get` returns the expense when found; `get` rejects with `NotFoundException` when `findOne` resolves `null` (`rejects.toThrow`); `create` converts `'2026-11-22'` to a UTC midnight `Date` passed to repository; `remove` rejects `NotFoundException` when repository returns `false`.
- [ ] **Step 2:** `cd api && pnpm test` → pass; mutation check (return wrong date slice) fails a test; revert.
- [ ] **Step 3:** Commit "test(api): lesson 2 service unit tests".

### Task 4: Lesson 3 — ExpenseRow component

**Files:**
- Create: `web/src/components/ExpenseRow.test.tsx`

**Interfaces:**
- Consumes: `ExpenseRow({ expense, onEdit, onDelete })`; buttons have aria-labels `แก้ไข ${title}` / `ลบ ${title}`; `src/test/setup.ts` already registers jest-dom and cleanup.

- [ ] **Step 1:** Write tests (comment `render`, `screen`, `getByRole`, `userEvent`, spies): shows title, Thai date, formatted amount; shows note only when present (`queryByText` → null when note is `null`); clicking `ลบ` calls `onDelete` once with the id; clicking `แก้ไข` calls `onEdit` with the expense. Render inside a `<ul>` wrapper since row is an `<li>`.
- [ ] **Step 2:** `cd web && pnpm test` → pass; commit "test(web): lesson 3 component tests".

### Task 5: Lesson 4 — Nest E2E with supertest and in-memory fakes

**Files:**
- Create: `api/test/fakes/in-memory-user.repository.ts`, `api/test/fakes/in-memory-expenses.repository.ts`, `api/test/expenses.e2e-spec.ts`

**Interfaces:**
- Produces: `class InMemoryUserRepository` implementing `findByEmail(email)`, `findById(id)`, `create({email, passwordHash})` (returns `null` on duplicate email, same contract as the real repo); `class InMemoryExpensesRepository` implementing the same public methods as `ExpensesRepository` (`findPage`, `create`, `findOne`, `update`, `remove`) scoped by `userId`. Both annotated with Thai comments "ตัวปลอมแทน DB".
- Consumes: real repository public signatures (read `api/src/user/user.repository.ts`, `api/src/expenses/expenses.repository.ts`); `ExpenseRecord.amount` is a 2-decimals string.

- [ ] **Step 1:** Implement the two fakes (Map-backed, `randomUUID` ids; fixed `createdAt`/`updatedAt` via `new Date()`).
- [ ] **Step 2:** In `expenses.e2e-spec.ts`: `beforeAll` stubs `DATABASE_URL` (any valid postgres URL, never connected) and a ≥32-byte `JWT_SECRET` with `vi.stubEnv`, dynamic-imports `AppModule`, builds the module with `overrideProvider(PrismaService).useValue({})`, `overrideProvider(UserRepository).useClass(InMemoryUserRepository)`, `overrideProvider(ExpensesRepository).useClass(InMemoryExpensesRepository)`, `createNestApplication()`, `init()`; `afterAll` closes the app. Helper `signupAndLogin(email)` returns the bearer header. If `PrismaService` still tries to connect on init, stub differently (e.g. override with a class with no-op `onModuleInit`) — verify by running.
- [ ] **Step 3:** Tests: `POST /auth/signup` → 201 and body has `email`, no password fields; duplicate signup → 409; login wrong password → 401; `GET /expenses` without token → 401; with garbage token → 401; create expense → 201 body matches input (`amount '125.50'`); then `GET /expenses` lists it; `DELETE /expenses/:id` → 204 and a following `GET /expenses/:id` → 404; user B cannot `GET` user A's expense (404).
- [ ] **Step 4:** `cd api && pnpm test:e2e` → pass with no DB running and no `.env`; commit "test(api): lesson 4 supertest e2e".

### Task 6: Lesson 5 — Playwright with intercepted API

**Files:**
- Create: `web/e2e/helpers.ts`, `web/e2e/expenses.spec.ts`

**Interfaces:**
- Produces: `loginAs(context)` — adds cookie `access_token=fake-token` for `127.0.0.1` path `/` (so the Server Component guard passes); `mockExpenses(page, initial: Expense[])` — registers `page.route('**/api/expenses', ...)` handling GET (returns current array), POST (parses `postDataJSON()`, appends an item with generated id/timestamps, `status 201`) and `page.route('**/api/expenses/*', ...)` handling DELETE (removes, `204`); returns the live array for assertions. Comments explain interception vs real network.
- Consumes: UI strings — heading `รายจ่าย`, button `เพิ่มรายจ่าย`, form labels `ชื่อรายการ`-style (read exact label text from `ExpenseForm.tsx`), delete button `ลบ <title>`, native `window.confirm` (use `page.once('dialog', d => d.accept())`), empty text `ยังไม่มีรายจ่ายในเดือนนี้`. Seeded expenses must have `spentOn` in the current month (compute in the test) since the screen filters by current month.

- [ ] **Step 1:** Write helpers as specified.
- [ ] **Step 2:** Write tests, each calling `loginAs` + `mockExpenses` itself: empty list shows empty text; seeded list shows two titles and the summary count; adding an expense through the form makes it appear; deleting (accept dialog) removes the row; unauthenticated visit to `/expenses` (no cookie) redirects to `/login`.
- [ ] **Step 3:** `cd web && pnpm test:e2e` → all pass (starts dev server itself); `pnpm test` still passes (Vitest ignores `e2e/`). If a locator needs it, add `data-testid` and note in commit.
- [ ] **Step 4:** Commit "test(web): lesson 5 playwright e2e".

### Task 7: Guide, verification, push `solution`

**Files:**
- Create: `docs/TESTING_GUIDE.md`
- Modify: root `README.md` (link to guide)

- [ ] **Step 1:** Write the Thai guide: what a test is (≤3 sentences), prerequisites (`pnpm install`, `playwright install chromium`), the five lessons as an ordered table (file, goal, run command, hint), how to peek at the answer (`git diff main..solution -- <file>`, or GitHub branch view), common errors, "ลองต่อยอด" (items from Review Focus + optional real-DB e2e).
- [ ] **Step 2:** Run all four suites from clean: api `pnpm test`, api `pnpm test:e2e`, web `pnpm test`, web `pnpm test:e2e` → all green. Also `pnpm lint` in both (fix test-file lint errors only).
- [ ] **Step 3:** Commit "docs: add testing guide"; `git push -u origin solution` (user explicitly asked for this branch on GitHub).

### Task 8: Skeleton on `main`

**Files:**
- Modify: every Task 2–6 test file (keep imports needed for hints; keep fakes and helpers complete)

- [ ] **Step 1:** `git checkout main`, then `git checkout solution -- .` and edit test files into skeletons: keep file header comment and `describe` blocks; each `it(...)` becomes `it.todo('same title')` preceded by a comment `// TODO(ผู้เรียน): ...` describing the call to make and the expected value. The first test of each lesson stays complete as a worked example. Remove now-unused imports so lint passes.
- [ ] **Step 2:** Run all four suites on `main`: they must exit 0 (todo tests are reported, not failed); the worked-example tests pass.
- [ ] **Step 3:** In the guide on `main`, ensure the "peek at the answer" commands refer to `solution`. Commit "chore: turn tests into learner exercises"; confirm with the user before `git push origin main`.
