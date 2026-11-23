import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const connectionString = process.env.TEST_DATABASE_URL;
let testUrl;
try {
  testUrl = new URL(connectionString ?? '');
} catch {
  // The validation below also handles a missing URL.
}

if (
  !testUrl ||
  !['postgresql:', 'postgres:'].includes(testUrl.protocol) ||
  testUrl.pathname !== '/expense_tracker_test'
) {
  console.error(
    'TEST_DATABASE_URL must point to the PostgreSQL database expense_tracker_test.',
  );
  process.exit(1);
}

const options = {
  env: { ...process.env, DATABASE_URL: connectionString },
  stdio: 'inherit',
};
const migrate = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'deploy'],
  options,
);

if (migrate.error) throw migrate.error;
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const tests = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    '--config',
    './vitest.config.e2e.ts',
    ...process.argv.slice(2),
  ],
  options,
);

if (tests.error) throw tests.error;
process.exitCode = tests.status ?? 1;
