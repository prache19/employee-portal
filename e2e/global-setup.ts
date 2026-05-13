import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup() {
  const root = path.resolve(__dirname, '..');
  console.log('[e2e] Resetting database and re-seeding sample data...');
  execSync('npm --workspace backend run db:seed', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
  });
}
