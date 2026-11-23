# Testing Exercises for Expense Tracker — Design

Date: 2026-11-24

## Intent and why

This repo is teaching material. Learners know Next.js and NestJS but have
never written a test. We want a guided first experience of testing: five short
lessons from easiest to hardest, each with a working reference solution they
can peek at when stuck.

Existing tests (`*.spec.ts`, `*.test.ts(x)`, `api/test/app.e2e-spec.ts`) are
discarded. All tests are redesigned from scratch to be simple and heavily
commented in Thai (code identifiers stay English; CLAUDE.md allows Thai
comments in teaching material only when asked — the user asked for explanatory
comments, and the repo's existing web comments are Thai, so comments are Thai).

## Goals

- Beginner-friendly, minimal tests: one idea per test, Arrange/Act/Assert.
- Tools: Vitest (api + web unit), supertest (api E2E), Playwright with
  `page.route()` interception (web E2E).
- Every test file explained by comments: what the code under test is, what
  each line does, why.
- Two branches: `solution` (all tests complete, all passing) and `main`
  (learner skeleton).
- A learner guide (`docs/TESTING_GUIDE.md`, Thai) saying which file to start
  with and in what order.

## Non-goals / anti-goals

- No real-database tests in the main track (optional advanced lesson may be
  mentioned in the guide, not built).
- No coverage targets, snapshot tests, or advanced mocking (timers, module
  mocks) — would overwhelm first-timers.
- Do not change product code behaviour. Only test files, test config,
  dev-dependencies, and docs change.
- Anti-goal: a skeleton so empty the learner doesn't know what to test, or a
  solution so clever it can't be read by a beginner.

## Constraints

- api: NestJS 12, Vitest ^4, supertest, Prisma 7 (real DB must NOT be
  required for tests), ESM with `.js` import suffixes.
- web: Next.js 16 (App Router), React 19, Vitest (aligned to the same major as
  api), Testing Library, jsdom.
- `/expenses` page is a Server Component that only checks the `access_token`
  cookie exists (`web/src/lib/backend.ts`). Playwright cannot mock
  server-side calls, so E2E tests set the cookie with `context.addCookies`
  and intercept browser requests to `/api/*` with `page.route()`.
- Playwright needs browsers downloaded (`pnpm exec playwright install
  chromium`) and `webServer` config to launch `next dev` on port 3001.
- Research current Playwright/Vitest/Nest testing docs while implementing;
  pin versions that work.

## Approaches considered

**Skeleton style**
1. *Skeleton with test titles and hints* (chosen): learner files keep
   `describe`/`it` names and comments describing what was removed and what to
   assert. Learner focuses on assertions; knows what to test.
2. Empty files with only a prompt: maximum thinking, too discouraging for a
   first-timer.
3. Branch per lesson: more incremental, but costly to maintain and merge.

**API E2E data layer**
- (chosen, by user) In-memory fakes via `overrideProvider` — no DB setup.
- Real Postgres — closest to production, but environment setup blocks
  beginners. Mentioned only as optional further reading.

## Design

### Branches

- `solution`: product code + complete, passing tests + guide.
- `main`: same product code + skeleton tests + guide. Each removed block is
  replaced by a comment, e.g.
  `// TODO(ผู้เรียน): เรียก toCents('10.50') แล้ว expect ว่าได้ 1050`.
  (Solution is committed first; skeleton is derived from it.)

### Lessons (in this order; the guide lists them)

| # | File | Teaches | Notes |
|---|------|---------|-------|
| 1 | `web/src/lib/expenses.test.ts`, `format.test.ts` | `describe/it/expect`, pure functions | `toCents`, `sumCents`, `filterByMonth`, `formatAmount`, `formatThaiDate` |
| 2 | `api/src/expenses/expenses.service.spec.ts` | `vi.fn()`, mocking a dependency, testing thrown errors | mock `ExpensesRepository`; cover list/get-found/get-not-found (NotFoundException) |
| 3 | `web/src/components/ExpenseRow.test.tsx` | Testing Library `render`, `screen`, `userEvent`, callback spies | optionally `ExpenseList` |
| 4 | `api/test/expenses.e2e-spec.ts` | supertest, HTTP status/body, auth header | Nest app built from `AppModule` with `overrideProvider` replacing `PrismaService`, `UserRepository`, `ExpensesRepository` with simple in-memory classes (in `api/test/fakes/`); flow: signup → login → create → list → delete; 401 without token |
| 5 | `web/e2e/expenses.spec.ts` | Playwright, `page.route()` interception, locators, cookie | mocked `GET/POST/DELETE /api/expenses`; flows: list renders, add an expense, delete one |

Config: `web/playwright.config.ts` (chromium only, `webServer` runs
`pnpm dev`), `web/e2e/` folder excluded from Vitest, scripts `test:e2e` in
web. api keeps `test` (unit) and `test:e2e` (now `vitest run --config
vitest.config.e2e.ts`, no DB script).

Fakes and Playwright helpers (`api/test/fakes/*`, `web/e2e/helpers.ts`) are
fully provided in both branches (not learner work) with comments.

### Guide: `docs/TESTING_GUIDE.md` (Thai)

Sections: what a test is (3 sentences), how to run each command, the five
lessons in order with file path / goal / command / hint, how to use the
`solution` branch (`git diff main..solution -- <file>` or view on GitHub),
common errors.

### Verification

On `solution`: `pnpm test` (api, web), `pnpm test:e2e` (api), `pnpm test:e2e`
(web, Playwright) all pass. On `main`: skeletons compile; unfinished tests
are marked `it.todo` or have empty bodies marked clearly so the suite status
is understandable (to be settled in implementation, favouring `it.todo`).

## Left to the builder

- Exact test cases per lesson within the scope above (keep each file under
  ~8 tests).
- Exact Playwright selectors (add `data-testid` only if unavoidable; this
  would be the one allowed product-code touch).
- Version pinning and dependency alignment details.
- Whether to delete the old `docs/superpowers` plans under api/web (leave
  them).

## Calls I made (not yet confirmed by the user)

- Thai comments in tests and Thai guide.
- Guide at root `docs/TESTING_GUIDE.md`; branch `solution` as one branch.
- Vitest major aligned across api/web.
- `it.todo` for unfinished skeleton tests.
- Lessons 2 and 3 added beyond the user's list (service unit + component
  test) to bridge from pure functions to E2E.
