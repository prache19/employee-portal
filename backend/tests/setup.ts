import path from 'node:path';
import os from 'node:os';

// Match global-setup.ts so workers get the same DB even if env wasn't inherited.
const TEST_DB_FILE = path.join(os.tmpdir(), 'employee-portal-test.db');
process.env.DATABASE_URL ??= `file:${TEST_DB_FILE}`;
process.env.NODE_ENV ??= 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-32chars-1234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-32chars-1234567890';
process.env.JWT_ACCESS_TTL ??= '15m';
process.env.JWT_REFRESH_TTL ??= '7d';
process.env.UPLOAD_DIR ??= path.resolve(process.cwd(), 'tests/.uploads');
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
