import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { backendEnv } from './environment.ts';

/**
 * Starts every run from a known database, so the tests do not depend on earlier runs.
 */
export default function globalSetup(): void {
    execFileSync(
        'php',
        ['artisan', 'migrate:fresh', '--force', '--seed', '--seeder=Database\\Seeders\\E2ESeeder'],
        {
            cwd: fileURLToPath(new URL('../../backend', import.meta.url)),
            env: { ...process.env, ...backendEnv },
            stdio: 'inherit',
        },
    );
}
