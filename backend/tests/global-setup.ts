import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

const TEST_DB_FILE = path.join(os.tmpdir(), 'employee-portal-test.db');
const TEST_UPLOAD_DIR = path.resolve(process.cwd(), 'tests/.uploads');

export default async function setup() {
  process.env.DATABASE_URL = `file:${TEST_DB_FILE}`;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars-1234567890';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-1234567890';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
  process.env.CORS_ORIGIN = 'http://localhost:5173';

  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try { fs.unlinkSync(TEST_DB_FILE + suffix); } catch { /* ignore */ }
  }
  fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_UPLOAD_DIR, 'payslips'), { recursive: true });

  execSync('npx prisma db push --skip-generate --force-reset', {
    stdio: 'inherit',
    env: { ...process.env },
  });

  return async () => {
    try { fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      try { fs.unlinkSync(TEST_DB_FILE + suffix); } catch { /* ignore */ }
    }
  };
}
