# Enterprise System Starter Kit

Fondasi aplikasi enterprise untuk satu perusahaan per instalasi. Prinsipnya: ruang lingkup kecil, standar tidak diturunkan. Modul bisnis dibangun di atas fondasi ini.

Keputusan, cakupan, dan standar pengembangan ada di [STANDARDS.md](STANDARDS.md). Ringkasan aturan kerja untuk developer dan AI agent ada di [CLAUDE.md](CLAUDE.md).

## Isi Base v1

| Modul | Lokasi backend | Lokasi frontend |
|---|---|---|
| Authentication (login, logout, reset password, rate limit) | `app/Core/Authentication` | `features/authentication` |
| Role & Permission | `app/Core/Authorization` | `features/roles` |
| Audit Log | `app/Core/Audit` | `features/audit-logs` |
| User Management | `app/Modules/UserManagement` | `features/users` |
| System Configuration | `app/Modules/SystemConfiguration` | `features/settings` |
| In-App Notification | `app/Modules/Notification` | `features/notifications` |
| Health check `/api/v1/health` | `app/Modules/Monitoring` | - |

Fase deployment (Docker, Nginx, backup) belum dikerjakan. Baseline yang wajib dipenuhi ada di [STANDARDS.md](STANDARDS.md) bagian 15.

## Stack

| Bagian | Teknologi |
|---|---|
| Backend | PHP 8.4, Laravel 13, Sanctum (SPA cookie), Spatie Permission, Spatie Activitylog, Scramble |
| Database | MySQL 8, Redis di staging dan production (local boleh driver `database`) |
| Frontend | React 19, TypeScript strict, Vite, Tailwind CSS 4, shadcn/ui, React Router, TanStack Query dan Table, Zustand, React Hook Form, Zod, Axios |
| Kualitas | Pint, PHPStan (Larastan), Pest, ESLint, Prettier, Vitest, Testing Library, MSW, Playwright |

## Struktur Repository

```text
backend/              Laravel API
  app/Core/           Fondasi lintas modul: Api, Audit, Authentication, Authorization, Logging, Routing, Security
  app/Modules/        Modul fitur; route di Modules/*/Routes/api.php dimuat otomatis dengan prefix /api/v1
  app/Shared/         Enum dan trait bersama
  tests/              Pest: Feature (Core, Modules, Database) dan Unit
frontend/             React SPA
  src/app/            Router, guard, provider, halaman global
  src/features/*      Satu folder per fitur
  src/components/     layouts, shared (DataTable, FormCard, ConfirmDialog, dll.), ui (shadcn/ui)
  src/hooks/ src/lib/ src/stores/
  e2e/                Test Playwright
STANDARDS.md          Standar dan keputusan proyek
dev.mjs               Menjalankan backend dan frontend sekaligus
```

## Menyiapkan Lingkungan Lokal

Kebutuhan: PHP 8.4 dengan `pdo_mysql`, `bcmath`, `intl`; Composer; Node.js 24; MySQL 8. Laragon sudah menyediakan PHP dan MySQL.

1. Buat dua database: `laravel_base` untuk development dan `laravel_base_test` untuk test.

2. Backend:

   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   php artisan app:create-super-admin
   ```

   `migrate --seed` mengisi role, permission, dan konfigurasi bawaan. `app:create-super-admin` membuat akun Super Admin pertama secara interaktif dan hanya bisa dijalankan sekali.

3. Frontend:

   ```bash
   cd frontend
   npm ci
   ```

4. Jalankan keduanya dari root:

   ```bash
   node dev.mjs
   ```

   Aplikasi terbuka di http://localhost:5173. Skrip ini memakai port backend kosong pertama antara 8000 dan 8020, meneruskannya ke proxy Vite, dan menghentikan keduanya dengan `Ctrl+C`. Port 5173 harus kosong karena `APP_URL` dan `SANCTUM_STATEFUL_DOMAINS` menunjuk ke sana.

Vite meneruskan `/api`, `/sanctum`, serta `POST /login` dan `POST /logout` ke Laravel, sehingga development meniru topologi satu domain di production.

## Perintah Harian

### Backend (`backend/`)

| Perintah | Kegunaan |
|---|---|
| `php artisan test` | Menjalankan seluruh test Pest di database `laravel_base_test` |
| `php artisan test --filter=NamaTest` | Menjalankan test tertentu |
| `php artisan test tests/Feature/Modules/UserManagement` | Menjalankan test satu folder |
| `vendor/bin/pint` | Merapikan format kode (`--test` hanya memeriksa) |
| `vendor/bin/phpstan analyse` | Static analysis |
| `composer audit` | Memeriksa kerentanan dependency |
| `php artisan route:list --path=api/v1` | Melihat route API beserta middleware |
| `php artisan migrate:fresh --seed` | Mengulang database development dari awal (menghapus semua data) |
| `php artisan pail` | Mengikuti log aplikasi secara langsung |
| `php artisan tinker` | REPL untuk mencoba kode dan query |
| `php artisan scramble:export --path=storage/app/openapi.json` | Mengekspor spesifikasi OpenAPI |

### Frontend (`frontend/`)

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Vite saja; backend dianggap ada di `http://localhost:8000` atau `BACKEND_URL` |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run type-check` | Pemeriksaan TypeScript |
| `npm run test` | Vitest sekali jalan; `npx vitest` untuk mode watch |
| `npm run build` | Build production ke `dist/` |
| `npm run api:types` | Membuat ulang `src/types/api.d.ts` dari `backend/storage/app/openapi.json` |
| `npm run test:e2e` | Playwright |
| `npx playwright test --ui` | Playwright dengan UI untuk debugging |
| `npx shadcn add <komponen>` | Menambahkan komponen shadcn/ui |

### Mengubah API

Setelah mengubah route, request, atau resource:

```bash
cd backend && DB_DATABASE=laravel_base_test php artisan scramble:export --path=storage/app/openapi.json
cd ../frontend && npm run api:types
```

Scramble membaca tipe kolom dari database, jadi export memakai database test yang sudah dimigrasi oleh `php artisan test`. CI gagal jika `frontend/src/types/api.d.ts` tidak sesuai dengan OpenAPI terbaru. Route baru juga wajib dicatat di [STANDARDS.md](STANDARDS.md) bagian 17; `RouteProtectionTest` dan `ApiDocumentationTest` memeriksanya.

### Test E2E

`npm run test:e2e` mereset database `laravel_base_test` dengan `E2ESeeder`, menjalankan backend di port 8011, lalu membuild frontend dan menyajikannya di port 5173. Hentikan dev server di port 5173 lebih dulu. Hasil run yang gagal tersimpan di `frontend/test-results/`.

## Alamat Berguna (local)

| Alamat | Isi |
|---|---|
| http://localhost:5173 | Aplikasi |
| http://localhost:5173/api/v1/health | Health check |
| `http://127.0.0.1:<port backend>/docs/api` | Dokumentasi API Scramble, hanya di environment `local` |
| `http://127.0.0.1:<port backend>/docs/api.json` | OpenAPI JSON, hanya di environment `local` |

Port backend dicetak oleh `dev.mjs` saat start.

## Sebelum Membuka Pull Request

Jalankan pemeriksaan yang sama dengan CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)):

```bash
# backend/
vendor/bin/pint --test
vendor/bin/phpstan analyse
php artisan test

# frontend/
npm run lint
npm run format:check
npm run type-check
npm run test
npm run build
```

CI juga menjalankan `composer audit`, `npm audit --audit-level=high`, pengecekan tipe API, dan Playwright.

Commit memakai Conventional Commits, misalnya `feat(user): add user deactivation`. Definition of Done ada di [STANDARDS.md](STANDARDS.md) bagian 14.5.

## Konvensi Singkat

- Alur backend: Controller, Form Request, Policy, Action, Model, API Resource. Satu Action untuk satu use case.
- API di `/api/v1`, update memakai PATCH, response berisi `success`, `message`, `data`, `errors`, `meta`, dan `code` pada error.
- Permission berformat `{resource}.{action}` dengan guard `web`. Role bawaan: Super Admin, Admin, Staff, Viewer.
- Resource diekspos lewat `uuid`; resource di luar scope pengguna mengembalikan 404.
- Frontend berbasis fitur di `src/features/*`; HTTP lewat satu Axios instance di `src/lib/api-client.ts`.
- Halaman daftar memakai `DataTable`, `SearchInput`, dan `FilterBar`; form memakai `FormCard` dan `useUnsavedChangesGuard`; aksi destruktif memakai `ConfirmDialog`.

Aturan lengkap ada di [STANDARDS.md](STANDARDS.md).

