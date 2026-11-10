export const BACKEND_PORT = 8011;
export const FRONTEND_URL = 'http://localhost:5173';

// Matches the account in backend/database/seeders/E2ESeeder.php.
export const E2E_USERNAME = 'e2e.admin';

// Only for the testing database, which the backend test suite also resets.
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'Uji-e2e-hanya-lokal-4417';

export const backendEnv = {
    APP_ENV: 'local',
    APP_URL: FRONTEND_URL,
    DB_DATABASE: process.env.E2E_DB_DATABASE ?? 'laravel_base_test',
    MAIL_MAILER: 'array',
    QUEUE_CONNECTION: 'sync',
    E2E_PASSWORD,
};
