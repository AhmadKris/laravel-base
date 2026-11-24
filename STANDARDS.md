# Standar Pengembangan

Dokumen ini adalah standar untuk setiap modul yang dibangun di atas base ini. Isinya diambil dari keputusan dan aturan yang sudah diterapkan di kode Base v1. Jika dokumen lain, termasuk `CLAUDE.md`, berbeda dari dokumen ini, dokumen ini yang berlaku. Perubahan standar dilakukan di sini, dalam perubahan yang sama dengan kodenya.

Prinsip proyek: **ruang lingkup kecil, standar tidak diturunkan.** Fitur boleh ditunda, tetapi yang dibangun harus benar sejak awal.

Bagian 17 dan 18 dibaca oleh test. Ubah tabelnya bersamaan dengan route dan permission, dan jangan mengubah format kolomnya.

---

## 1. Keputusan yang Berlaku

| Topik | Keputusan |
|---|---|
| Model perusahaan | Satu perusahaan per instalasi, tanpa company, branch, atau tabel `organizations`. Profil perusahaan disimpan di `system_configurations`. |
| Stack | PHP 8.4, Laravel 13, MySQL 8, Redis, React, TypeScript, Vite, Tailwind CSS 4, shadcn/ui |
| Struktur backend | `app/Core`, `app/Modules`, `app/Shared` |
| Topologi | Satu domain: `/` untuk frontend, `/api` untuk Laravel. Production tidak memerlukan CORS. |
| Autentikasi SPA | Sanctum cookie session dengan CSRF |
| Password hashing | Argon2id |
| Role | Global per user, tanpa Spatie teams. Seed: Super Admin, Admin, Staff, Viewer. |
| Format permission | `{resource}.{action}`, singular, snake_case, guard `web` |
| Identifier API | `id` berisi UUID, kecuali `roles`, `permissions`, dan `audit-logs` yang memakai ID bawaan paket |
| Model bersama | `User` boleh direferensikan langsung antarmodul. Model lain melalui contract atau event. |
| User dan karyawan | `users` hanya menyimpan data akun. Data HR (alamat, NIK, jabatan, atasan) masuk modul HRM di tabel `employees` dengan `user_id` yang boleh kosong. |
| Scope data pengguna | Super Admin, System Admin, dan Admin melihat semua pengguna. Role lain hanya akunnya sendiri. |
| HTTP method update | PATCH. PUT hanya untuk mengganti seluruh daftar, seperti role atau permission. |
| Resource di luar scope | HTTP 404 |
| Notifikasi | Laravel Database Notifications |
| Cache dan queue | Redis di staging dan production. Local boleh driver `database`. |
| Email sistem | Nama pengirim dari `company.name`, alamat pengirim `MAIL_FROM_ADDRESS`, Reply-To `company.email` |
| Dokumentasi API | OpenAPI digenerate Scramble. Tipe frontend digenerate dari OpenAPI. |

### Sengaja ditunda

| Area | Ditunda | Ditambahkan saat |
|---|---|---|
| Autentikasi | Token API untuk klien eksternal, verifikasi email saat akun dibuat | Ada klien eksternal atau kebutuhan bisnis |
| Undangan pengguna | Undangan lewat email. Password yang diisi admin tetap tersedia sebagai cadangan. | Dibutuhkan |
| Retensi | Audit log 1 tahun, notifikasi yang sudah dibaca 90 hari | Dibutuhkan |
| MFA | Enrollment dan recovery | Sebelum aplikasi nyata go-live, minimal untuk akun privileged |
| Data karyawan | Seluruh data HR | Modul HRM dibangun |
| Workflow, Document, Master Data, Reporting, Integration | Seluruh modul | Modul bisnis pertama membutuhkannya |
| Tabel | `security_events`, `idempotency_keys` | Fitur terkait dibangun. Event keamanan masuk `activity_log`. |
| Security | Matriks ASVS per requirement, DAST, scan image, SBOM, penetration test | Sebelum rilis aplikasi bisnis |
| Testing | Target coverage sebagai gate, load test, UAT formal | Aplikasi bisnis mendekati rilis |
| Struktur | Multi-company dan branch | Perusahaan benar-benar membutuhkannya. Perlu migration untuk menambahkan organisasi pada data yang sudah ada. |

Jangan membangun hal yang ditunda tanpa diminta. Jika kebutuhan nyata muncul, putuskan dulu, lalu perbarui tabel ini.

---

## 2. Arsitektur dan Struktur Folder

Backend adalah modular monolith. Frontend adalah SPA berbasis feature.

```text
backend/
  app/Core/          Fondasi lintas modul: Api, Audit, Authentication, Authorization,
                     Logging, Mail, Modules, Routing, Security
  app/Modules/       Modul fitur. Route di Modules/*/Routes/api.php dimuat otomatis
                     dengan prefix /api/v1.
  app/Shared/        Contract, enum, dan trait bersama
  config/            authorization.php, navigation.php, dan konfigurasi Laravel
  resources/views/vendor/   Template email (mail dan notifications)
  tests/             Pest: Feature (Core, Modules, Database) dan Unit
frontend/
  src/app/           Router, guard, provider, halaman global
  src/features/*     Satu folder per fitur
  src/components/    layouts, shared (komponen aplikasi), ui (shadcn/ui)
  src/hooks/ src/lib/ src/stores/ src/types/
  e2e/               Test Playwright
```

Isi satu modul backend. Buat folder hanya jika ada isinya.

```text
app/Modules/Procurement/
  Actions/           Satu class per use case: CreatePurchaseRequestAction
  Controllers/
  Events/ Listeners/ Jobs/
  Exceptions/        Turunan ApiException dengan code sendiri
  Models/
  Policies/
  Requests/          Form Request, termasuk turunan ListRequest untuk daftar
  Resources/         API Resource
  Routes/api.php
  Services/          Hanya untuk logika yang dipakai beberapa Action
  module.php         Pendaftaran modul dan menu (bagian 10.1)
  permissions.php    Pendaftaran permission (bagian 8.3)
```

Isi satu feature frontend:

```text
src/features/procurement/
  components/        Form, kolom tabel, dialog
  pages/             Halaman yang dipasang di router, beserta test-nya
  services/          Pemanggilan API lewat apiClient
  schemas.ts         Schema Zod
```

### Komunikasi antarmodul

1. Jangan memanggil controller atau model internal modul lain. Pengecualian: `User`.
2. Modul yang membutuhkan hasil langsung dari modul lain memakai contract di `app/Shared/Contracts`, dengan implementasi di modul pemiliknya. Contoh: `CompanyProfile`, `ModuleAvailability`.
3. Modul yang mengumumkan kejadian memakai event. Event yang memicu proses lanjutan dikirim setelah commit, melalui `DB::afterCommit()` atau `ShouldDispatchAfterCommit`.
4. Pekerjaan yang tidak harus selesai dalam request memakai queue job.
5. Hindari dependency melingkar antarmodul.

---

## 3. Backend

### 3.1 Alur request

Controller, lalu Form Request, Policy, Action, Model, dan API Resource.

| Layer | Tanggung jawab |
|---|---|
| Controller | Menerima request dan mengembalikan response. Tanpa query kompleks, kalkulasi bisnis, atau validasi manual. |
| Form Request | Validasi input. Controller hanya memakai `$request->validated()`, tidak pernah `$request->all()`. |
| Policy | Akses ke resource. Permission diperiksa di route middleware dan Policy. |
| Action | Satu use case, misalnya `DeactivateUserAction`. Transaksi berada di sini. |
| Service | Logika yang dipakai ulang oleh beberapa Action. Bukan pembungkus satu query. |
| Model | Entity, relasi, cast, dan scope query |
| API Resource | Field yang diekspos. Model tidak pernah dikembalikan langsung. |

Repository, Contract, dan DTO hanya dibuat jika ada kebutuhan nyata saat itu.

### 3.2 Aturan kode

- Setiap file PHP memakai `declare(strict_types=1)`, type lengkap pada parameter, return, dan property, serta `readonly` jika sesuai.
- Nilai bisnis memakai Enum, misalnya `ActiveStatus`, `AuditEvent`.
- Dependency diambil melalui constructor atau method injection.
- Kode, identifier, tabel, dan API dalam bahasa Inggris. Teks untuk pengguna dalam Bahasa Indonesia.
- Komentar hanya menjelaskan alasan yang tidak terlihat dari kode.
- Jangan menelan exception. Error bisnis dilempar sebagai turunan `App\Core\Api\Exceptions\ApiException` dengan code dan status, lalu dirender oleh `ApiExceptionRenderer`.

```php
final class UserSelfDeactivationException extends ApiException
{
    public function __construct()
    {
        parent::__construct('You cannot deactivate your own account.', 'USER_SELF_DEACTIVATION', 409);
    }
}
```

### 3.3 Transaksi, event, dan job

- Perubahan yang harus konsisten dibungkus `DB::transaction()`. Pakai `lockForUpdate()` jika baris harus dikunci selama diproses.
- Jangan memanggil HTTP, mengirim email, atau menjalankan proses lambat di dalam transaksi.
- Job harus aman dijalankan ulang, memiliki timeout dan retry yang jelas, payload minimal (ID, bukan model besar), dan tanpa secret.

### 3.4 Penamaan

| Komponen | Konvensi | Contoh |
|---|---|---|
| Class PHP | PascalCase | `CreateUserAction` |
| Method dan variabel PHP | camelCase | `findActiveUser()` |
| Konstanta | UPPER_SNAKE_CASE | `AVATAR_DISK` |
| Tabel | snake_case, plural | `purchase_requests` |
| Kolom | snake_case | `approved_at`, `is_active` |
| Komponen React | PascalCase | `UserForm.tsx` |
| Hook React | camelCase dengan awalan `use` | `useTableParams.ts` |
| Type TypeScript | PascalCase | `ApiResponse` |
| Resource API | plural kebab-case | `/api/v1/purchase-requests` |
| Variabel environment | UPPER_SNAKE_CASE | `MAIL_FROM_ADDRESS` |

Hindari nama generik seperti `Manager`, `Helper`, `Util`, `data`, `info`, atau `processData`.

---

## 4. Database

### 4.1 Skema

- Semua perubahan skema lewat migration. Migration yang sudah diterapkan di environment bersama tidak diedit. Buat migration baru.
- `id` BIGINT UNSIGNED untuk internal, `uuid` untuk API. Model yang diekspos memakai trait `HasPublicUuid`, yang mengisi `uuid` dan mengembalikannya dari `getRouteKeyName()`.
- Foreign key dan delete behavior ditulis eksplisit. Data bisnis memakai `restrictOnDelete`. Penghapusan dilakukan melalui proses bisnis, bukan cascade.
- Unique constraint untuk data yang tidak boleh ganda. Validasi di aplikasi tidak menggantikan constraint.
- Index dibuat berdasarkan query nyata, dengan urutan kolom composite index mengikuti filter yang dominan.
- Uang memakai `DECIMAL(18,2)` dan BCMath, tidak pernah `float`. Persentase `DECIMAL(8,4)`.
- Timestamp disimpan dalam UTC. Tanggal bisnis tanpa jam memakai `DATE`.
- Relasi polymorphic (`reference_type`, `reference_id`) divalidasi di aplikasi terhadap allowlist, karena tidak dapat dijaga foreign key.
- Soft delete hanya untuk data master atau operasional yang masih dirujuk histori. Tabel histori dan transaksi tidak memakai soft delete sebagai pengganti retensi.
- Perubahan berisiko pada tabel yang sudah berjalan memakai expand-and-contract: tambah kolom baru, pindahkan data, baru hapus kolom lama di rilis berikutnya.

### 4.2 Tipe data

| Data | Tipe MySQL |
|---|---|
| ID internal | BIGINT UNSIGNED |
| UUID | CHAR(36) |
| Nama | VARCHAR(150) |
| Email | VARCHAR(255) |
| Status | VARCHAR(30), nilainya dari Enum |
| Boolean | BOOLEAN, nama kolom `is_*` |
| Uang | DECIMAL(18,2) |
| Data terstruktur | JSON |

### 4.3 Query

- Query N+1 dilarang. Relasi yang dipakai pada koleksi wajib di-eager load.
- Setiap endpoint daftar memiliki test bahwa jumlah query tidak bertambah mengikuti jumlah baris, dengan menambahkan kasusnya ke `tests/Feature/Core/QueryCountTest.php`.
- Koleksi selalu dipaginasi. Pemrosesan data besar memakai `chunkById()` atau `lazyById()`.
- Query memakai query builder dengan parameter binding. Jangan menyusun SQL dari input pengguna.
- Data yang terlihat oleh user dibatasi lewat scope query yang konsisten, misalnya `visibleTo($user)`.

---

## 5. API

### 5.1 URL dan method

- Base path `/api/v1`. Resource plural kebab-case: `/workflow-instances`, bukan `/workflowInstances` atau `/getUsers`.
- GET membaca, POST membuat atau menjalankan aksi, PATCH mengubah sebagian, PUT mengganti seluruh daftar, DELETE menghapus atau menonaktifkan.
- Status yang dipakai: 200, 201, 204, 400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503.
- Breaking change, termasuk perubahan tipe field dan penghapusan endpoint, memakai versi baru (`/api/v2`). Menambah field opsional bukan breaking change.

### 5.2 Format response

Semua response dibuat lewat `App\Core\Api\Responses\ApiResponse` (`success`, `paginated`, `error`).

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [{ "id": "01932f5e-1234-7000-8000-123456789abc", "name": "User A" }],
  "meta": {
    "pagination": { "current_page": 1, "per_page": 20, "total": 100, "last_page": 5, "from": 1, "to": 20 }
  }
}
```

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "code": "VALIDATION_FAILED",
  "data": null,
  "errors": { "email": ["The email has already been taken."] },
  "meta": null
}
```

- `code` hanya ada pada error. Client bergantung pada `code`, bukan `message`.
- Setiap response membawa header `X-Request-ID` yang sama dengan `request_id` di log.
- Error tidak pernah memuat stack trace, SQL, path server, credential, atau konfigurasi, juga saat debug.
- Timestamp dikirim dalam ISO 8601 dengan zona waktu, misalnya `2026-11-09T10:30:00Z`. Tanggal tanpa jam `YYYY-MM-DD`.
- Field `id` dan relasi `*_id` berisi UUID. Status user dikirim sebagai `active` atau `inactive`, bukan boolean.
- Data yang tidak pernah dikembalikan: password dan hash-nya, token, session ID, secret integrasi, path storage internal, dan konfigurasi privat.

### 5.3 Daftar, filter, pencarian, dan urutan

Endpoint daftar memakai Form Request turunan `App\Core\Api\Pagination\ListRequest`.

| Parameter | Aturan |
|---|---|
| `page`, `per_page` | Default `per_page` 20, maksimum 100 |
| `search` | Hanya pada field yang diizinkan. `%` dan `_` dicari sebagai teks. Pola dibentuk dengan `searchPattern()`. |
| `sort_by`, `sort_direction` | `sort_by` dari `sortableFields()`, `sort_direction` `asc` atau `desc` |
| Filter lain | Didefinisikan di `filterRules()`. Nama kolom tidak pernah diterima bebas dari client. |
| `date_from`, `date_to` | Dari `dateRangeRules()` dan `applyDateRange()`. Frontend mengirim batas hari dengan offset zona waktu perusahaan. Backend mengubahnya ke UTC. |

### 5.4 Error code

Code memakai UPPER_SNAKE_CASE dengan awalan modul. Code yang sudah ada:

| Code | Status | Arti |
|---|---|---|
| `AUTH_UNAUTHENTICATED` | 401 | Belum login atau sesi berakhir |
| `AUTH_FORBIDDEN` | 403 | Tidak memiliki permission |
| `AUTH_INVALID_CREDENTIALS` | 401 | Login gagal, tanpa menyebut field yang salah |
| `AUTH_PASSWORD_RESET_INVALID` | 422 | Token reset tidak berlaku |
| `AUTH_EMAIL_CHANGE_INVALID` | 422 | Tautan konfirmasi email tidak berlaku |
| `AUTH_CURRENT_SESSION` | 409 | Mencoba mengakhiri sesi yang sedang dipakai |
| `AUTH_PRIVILEGE_ESCALATION` | 403 | Memberi akses melebihi kewenangan |
| `CSRF_TOKEN_MISMATCH` | 419 | Token CSRF tidak cocok |
| `VALIDATION_FAILED` | 422 | Validasi input gagal, detail di `errors` |
| `INVALID_REQUEST` | 400 | Request tidak dapat dibaca |
| `RESOURCE_NOT_FOUND` | 404 | Tidak ada atau di luar scope |
| `RESOURCE_CONFLICT` | 409 | Bentrok dengan kondisi data |
| `RESOURCE_VERSION_CONFLICT` | 409 | Optimistic lock gagal |
| `METHOD_NOT_ALLOWED` | 405 | Method tidak didukung |
| `PAYLOAD_TOO_LARGE` | 413 | Body atau file terlalu besar |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Jenis konten tidak didukung |
| `TOO_MANY_REQUESTS` | 429 | Rate limit |
| `MODULE_DISABLED` | 404 | Modul opsional sedang nonaktif |
| `ROLE_PROTECTED` | 409 | Role bawaan tidak dapat diubah |
| `ROLE_IN_USE` | 409 | Role masih dipakai pengguna |
| `USER_SELF_DEACTIVATION` | 409 | Menonaktifkan akun sendiri |
| `USER_LAST_SUPER_ADMIN` | 409 | Menonaktifkan Super Admin aktif terakhir |
| `SERVICE_UNAVAILABLE` | 503 | Layanan sedang tidak tersedia |
| `SYSTEM_INTERNAL_ERROR` | 500 | Error tak terduga |

Pelanggaran aturan bisnis memakai 409 jika bentrok dengan kondisi data, dan 422 jika input tidak dapat diterima. Code baru ditambahkan ke tabel ini dan diberi pesan Bahasa Indonesia di `frontend/src/lib/api-error.ts`.

### 5.5 Rate limit

Rate limiter didaftarkan di `app/Core/Security/RateLimits.php`.

| Limiter | Batas | Kunci |
|---|---|---|
| `login` | 5 per menit | identifier dan IP |
| `password-reset` | 5 per menit | email dan IP |
| `password-change`, `email-change` | 5 per menit | user |
| `email-change-confirm` | 10 per menit | IP |
| `uploads` | 20 per menit | user |
| `api` | 120 per menit | user, atau IP untuk tamu |

Endpoint baru yang mahal (export, import, upload, pengiriman email) memakai limiter tersendiri.

### 5.6 Dokumentasi API dan tipe frontend

- OpenAPI digenerate Scramble dari route, Form Request, dan API Resource. Field nullable yang tidak dapat disimpulkan diberi `/** @var string|null */`.
- Setelah mengubah endpoint, generate ulang tipe frontend dari database test yang sudah dimigrasi, karena Scramble membaca tipe kolom dari database:

  ```bash
  # backend/
  DB_DATABASE=laravel_base_test php artisan scramble:export --path=storage/app/openapi.json
  # frontend/
  npm run api:types
  ```

- CI gagal jika `frontend/src/types/api.d.ts` berbeda dari hasil generate.

---

## 6. Idempotency dan Optimistic Locking

Kontrol ini hanya untuk endpoint yang terdaftar di bawah. Endpoint baru yang berisiko ditambahkan ke daftar dalam perubahan yang sama.

### 6.1 Idempotency key

Wajib untuk endpoint yang dapat menghasilkan data atau proses ganda jika dikirim ulang: pembayaran, pengajuan transaksi, perubahan stok, import, export, dan transaksi ke sistem eksternal. Base v1 belum memiliki endpoint seperti ini.

| Endpoint | Modul | Risiko |
|---|---|---|
| Belum ada | | |

Aturan saat diterapkan:

| Kondisi | Hasil |
|---|---|
| Header `Idempotency-Key` tidak dikirim | 400, `IDEMPOTENCY_KEY_REQUIRED` |
| Key dan body sama, proses sudah selesai | Response tersimpan dikembalikan dengan header `Idempotency-Replayed: true` |
| Key sama, body berbeda | 409, `IDEMPOTENCY_KEY_CONFLICT` |
| Key sama, proses masih berjalan | 409, `IDEMPOTENCY_KEY_IN_PROGRESS` |
| Proses berakhir 5xx | Response tidak disimpan, client boleh mencoba lagi |

Key berlaku per user dan endpoint selama 24 jam, diterapkan lewat route middleware. Frontend membuat satu key per aksi submit dan memakainya lagi saat retry.

Aksi yang sudah dijaga pemeriksaan status dan `lockForUpdate`, atau unique constraint, tidak memerlukan idempotency key.

### 6.2 Optimistic locking

Wajib jika beberapa user dapat mengubah resource yang sama dan perubahan yang tertimpa berdampak nyata, misalnya draft transaksi yang dapat diedit lebih dari satu user.

| Endpoint | Risiko |
|---|---|
| `PUT /roles/{id}/permissions` | Seluruh daftar permission tertimpa |
| `PATCH /system-configurations/{key}` | Konfigurasi tertimpa |
| `PUT /navigation/layout` | Seluruh susunan menu tertimpa |
| `PUT /modules` | Status modul tertimpa |

Aturan:

1. Tabel memiliki kolom `version` (INT UNSIGNED, default 1), dan API Resource mengembalikan `version`.
2. Client wajib mengirim `version` terakhir yang diterima. Tanpa `version`, response 422.
3. Model memakai trait `HasOptimisticLock` dan menyimpan dengan `updateWithVersion($expectedVersion, $attributes)`, yang menaikkan `version` secara atomik.
4. Jika versi sudah berubah, response 409 `RESOURCE_VERSION_CONFLICT`. Frontend meminta user memuat ulang sebelum menyimpan lagi.

`PATCH /users/{id}` tidak memakainya, karena perubahan jarang bersamaan dan tercatat di audit log.

---

## 7. Autentikasi dan Sesi

- SPA memakai cookie session Sanctum dengan CSRF. Token tidak disimpan di `localStorage` atau `sessionStorage`.
- Login memakai rate limit, pesan gagal yang tidak menyebut apakah akun ada, pemeriksaan status akun, dan regenerasi session.
- Password minimal 12 karakter dan ditolak jika diketahui bocor (`Password::uncompromised()`). Tanpa aturan kompleksitas tambahan. Disimpan dengan Argon2id.
- Token reset password dan konfirmasi email dikirim di URL fragment, berlaku 60 menit, dan sekali pakai.
- Remember me opsional per login dan berlaku 30 hari. Token-nya dirotasi saat logout, ubah password, reset password, mengakhiri sesi lain, dan penonaktifan akun.
- Cookie production: `SESSION_SECURE_COOKIE=true`, HttpOnly, `SameSite=Lax`.
- Perubahan email oleh pengguna diverifikasi lewat tautan ke alamat baru, dan pemberitahuan dikirim ke alamat lama.

---

## 8. Otorisasi

### 8.1 Prinsip

- Deny by default. Setiap endpoint terlindungi memeriksa permission di route middleware dan Policy di backend.
- Tampilan berbasis permission di frontend hanya kemudahan UI, bukan batas keamanan.
- Ownership, role, dan field internal diambil dari server, tidak pernah dari request.
- Resource di luar scope data user mengembalikan 404. Resource di dalam scope yang tidak boleh diakses mengembalikan 403.
- Periksa permission, bukan nama role, kecuali untuk aturan yang memang melekat pada role seperti Super Admin terakhir.

### 8.2 Role

| Role | Status | Cakupan |
|---|---|---|
| Super Admin | Seed | Seluruh permission dan semua data |
| Admin | Seed | Mengelola pengguna dan pengaturan perusahaan, membaca audit log |
| Staff | Seed | Aktivitas operasional pada data yang diizinkan |
| Viewer | Seed | Hanya melihat data yang diizinkan |
| System Admin, Manager, Supervisor | Ditambahkan sebagai data saat dibutuhkan | Sudah dikenal di `config/authorization.php` |

Permission tiap role yang di-seed ada di bagian 18.

### 8.3 Permission

Format `{resource}.{action}`, singular, snake_case. Sub-resource menjadi segmen tambahan, misalnya `integration.logs.view`. Modul bisnis memakai nama modul sebagai resource, misalnya `procurement.view`.

Action yang dipakai: `view`, `create`, `update`, `delete`, `approve`, `reject`, `submit`, `cancel`, `export`, `import`, `download`, `assign`, `configure`. Hindari permission yang terlalu luas seperti `admin` atau `manage_all`.

Setiap modul mendaftarkan permission-nya di `permissions.php` pada root modul. `PermissionCatalog` membaca semua file tersebut untuk seeder, `GET /permissions`, dan validasi prasyarat. Frontend tidak menyimpan daftar permission sendiri.

```php
return [
    'user' => [
        'label' => 'Pengguna',
        'position' => 10,
        'permissions' => [
            'user.view' => [
                'label' => 'Lihat pengguna',
                'description' => 'Membuka menu, daftar, dan detail pengguna.',
            ],
            'user.create' => [
                'label' => 'Tambah pengguna',
                'description' => 'Membuat akun pengguna baru.',
                'requires' => ['user.view'],
            ],
        ],
    ],
];
```

1. Key grup adalah bagian `{resource}`, dan setiap permission dalam grup diawali key tersebut.
2. `label` dan `description` ditulis dalam Bahasa Indonesia untuk admin yang mengatur role.
3. `position` mengatur urutan grup. Permission ditulis berurutan `view`, `create`, `update`, `delete`, lalu yang lain.
4. `requires` berisi permission yang wajib dimiliki agar permission tersebut berguna. Prasyarat boleh dari modul lain.
5. Katalog yang tidak valid melempar `LogicException` saat dimuat, dan `PermissionCatalogTest` gagal di CI. Perbarui daftar yang diharapkan di test tersebut dan matriks di bagian 18.
6. Permission baru di environment yang sudah berjalan dibuat dengan menjalankan ulang `RolePermissionSeeder`. Mencabut permission dari role dilakukan lewat migration.

### 8.4 Scope data dan pencegahan privilege escalation

- Query data melalui scope yang sama di daftar dan detail, misalnya `visibleTo($user)`.
- Role yang boleh diberikan oleh setiap role diatur di `assignable_roles` pada `config/authorization.php`. Super Admin dapat memberikan semua role. Role tanpa entri tidak dapat memberikan role apa pun.
- Role selain `unrestricted_roles` hanya dapat membaca dan mengubah key konfigurasi berawalan `allowed_prefixes` (`company.`, `localization.`). Key lain mengembalikan 404, begitu juga audit log konfigurasi di luar prefix tersebut.
- Role bawaan dilindungi. Super Admin aktif terakhir tidak dapat dinonaktifkan, dan user tidak dapat menonaktifkan dirinya sendiri.
- Perubahan role dan permission menginvalidasi cache permission dan tercatat di audit log.
- Transaksi bisnis yang memiliki approval wajib memeriksa assignment, status, dan larangan menyetujui pengajuan sendiri. Hak administratif tidak otomatis berarti boleh menyetujui.

---

## 9. Keamanan

### 9.1 Data sensitif

- Password, token, session, dan secret tidak boleh masuk log, response, audit log, payload job, atau variabel `VITE_*`. Satu-satunya variabel `VITE_*` adalah `VITE_API_BASE_URL`.
- `AuditLogger` menyamarkan key sensitif secara otomatis, tetapi jangan mengirim nilai sensitif kepadanya.
- Konfigurasi sensitif disimpan terenkripsi dan tidak pernah dikembalikan oleh API.
- `.env` tidak di-commit. `.env.example` diperbarui saat variabel baru ditambahkan.

### 9.2 File

- File disimpan di private storage dengan nama acak, tidak pernah dengan nama asli. Download selalu melalui endpoint yang memeriksa otorisasi.
- Validasi ekstensi dan tipe dari isi file, keduanya dari allowlist. Jangan percaya `Content-Type` dari browser.
- Batasi ukuran file. Gambar juga dibatasi 40 megapiksel dari header sebelum dibuka.
- Gambar ditulis ulang di server sebagai PNG, sehingga data yang disisipkan terbuang. SVG ditolak.
- Response file memakai `X-Content-Type-Options: nosniff` dan `Content-Security-Policy: default-src 'none'; sandbox`. File milik user memakai `Cache-Control: private`.
- Satu-satunya file publik adalah logo, logo latar gelap, dan favicon perusahaan, karena dibutuhkan halaman login.

### 9.3 Input dan output

- Semua input divalidasi Form Request, termasuk tipe, panjang, format, keunikan, relasi, dan aturan bisnis. Validasi frontend tidak menggantikannya.
- Field di luar kontrak diabaikan karena hanya `validated()` yang dipakai.
- Frontend tidak memakai `dangerouslySetInnerHTML`. Email memakai `Markdown::withSecuredEncoding()`, sehingga teks dari pengguna tidak dirender menjadi tautan atau HTML.

### 9.4 Audit log

- Aksi sensitif dicatat tepat sekali melalui `App\Core\Audit\AuditLogger::record($event, $subject, $properties, $actor)`. IP, user agent, dan request ID ditambahkan otomatis.
- Nama event memakai format `{modul}.{kejadian}`, misalnya `user.deactivated`, dan didaftarkan sebagai case di `App\Core\Audit\Enums\AuditEvent` beserta labelnya. Modul baru ditambahkan ke `AuditModule`.
- Yang dicatat: login, logout, login gagal, perubahan password dan email, perubahan user, role, permission, konfigurasi, penghapusan data, approval, dan akses dokumen sensitif.
- Aksi baru ditambahkan ke `AuditCoverageTest`.
- Audit log hanya dapat dibaca, tidak dapat diubah pengguna.

### 9.5 Kepatuhan

Jangan mengklaim kepatuhan OWASP ASVS tanpa bukti verifikasi per requirement. Status keamanan ditulis sebagai hasil pemeriksaan beserta test atau bukti yang dijalankan.

---

## 10. Modul, Menu, dan Email

### 10.1 Mendaftarkan modul dan menu

Modul yang tampil di Pengaturan > Modul atau memiliki item menu mendaftarkan diri di `module.php` pada root modul. `ModuleCatalog` membaca semua file tersebut. Bagian menu bawaan didefinisikan di `config/navigation.php`.

```php
return [
    'key' => 'user_management',
    'label' => 'Pengguna',
    'description' => 'Akun pengguna, status, dan role yang dimilikinya.',
    'core' => true,
    'menu' => [
        'users' => [
            'label' => 'Pengguna',
            'path' => '/users',
            'icon' => 'users',
            'permission' => 'user.view',
            'section' => 'administration',
            'position' => 10,
        ],
    ],
];
```

1. `key` modul dan key item menu unik di seluruh aplikasi: huruf kecil, angka, garis bawah, atau tanda hubung.
2. `core: true` hanya untuk modul yang dibutuhkan agar aplikasi dapat dikelola. Modul opsional memasang middleware `module:{key}` pada seluruh route-nya, dan memeriksa `ModuleAvailability` sebelum membuat data dari listener atau job.
3. `icon` adalah nama ikon Lucide kebab-case yang terdaftar di `frontend/src/components/layouts/navigationIconSet.ts`. Ikon yang boleh dipilih admin diatur di `icons` pada `config/navigation.php`. Ikon baru ditambahkan ke kedua tempat, beserta label dan kata kunci pencarian dalam Bahasa Indonesia.
4. `permission` sama dengan permission yang melindungi halaman. Kosongkan hanya untuk halaman yang dapat dibuka semua user yang login.
5. `section` merujuk ke key di `config/navigation.php`. `position` mengatur urutan bawaan.
6. `can_hide` bawaannya `true`. Isi `false` untuk halaman yang dibutuhkan admin agar tidak terkunci dari pengaturan.
7. Route frontend modul opsional dibungkus `ModuleRoute`, sehingga URL modul nonaktif menampilkan "Modul tidak aktif". Bagian UI di luar halamannya memakai `useModuleEnabled`.

Admin dapat mengubah label, ikon, urutan, bagian, dan visibilitas item di Pengaturan > Menu. Bagian boleh tanpa judul. Menyembunyikan item dari menu tidak menonaktifkan modul atau mencabut akses ke URL-nya.

### 10.2 Email

1. Email dibuat sebagai Markdown mail atau notifikasi `MailMessage`, sehingga memakai template di `backend/resources/views/vendor/mail` dan `backend/resources/views/vendor/notifications`.
2. Nama, alamat, telepon, dan email perusahaan dibaca melalui contract `App\Shared\Contracts\CompanyProfile`, bukan dari `config('app.name')` atau langsung dari `system_configurations`.
3. Jangan mengisi pengirim di setiap email. `UseCompanyAsSender` memakai nama perusahaan sebagai nama pengirim dan `company.email` sebagai Reply-To. Alamat pengirim tetap `MAIL_FROM_ADDRESS`, karena hanya domain yang diizinkan server email yang lolos SPF dan DKIM.
4. Email tidak dikirim di dalam transaksi. Email massal atau yang dipicu proses lanjutan dikirim lewat queue.

---

## 11. Frontend

- TypeScript strict, tanpa `any`.
- Struktur feature-based di `src/features/*` (bagian 2).
- Server state di TanStack Query. Client state global di Zustand hanya jika perlu. Form dengan React Hook Form dan Zod. State URL (filter, halaman) di React Router.
- Jangan menyalin response API ke Zustand jika sudah dikelola TanStack Query.
- HTTP hanya melalui service di feature yang memakai satu instance `apiClient` (`src/lib/api-client.ts`). Komponen tidak memanggil Axios langsung.
- Query key memuat filter, sorting, dan pagination. Parameter tabel dikelola `useTableParams`.
- Tipe request dan response diambil dari `src/types/api.d.ts` hasil generate.
- Error server diubah dengan `toApiError`. Error per field dipasang ke form dengan `applyFieldErrors`, dan error form dengan `applyFormError`. Pesan per `code` ada di `src/lib/api-error.ts`.
- Pemeriksaan permission di UI memakai `usePermission`.
- Validasi frontend untuk kenyamanan pengguna. Backend tetap sumber kebenaran.
- Halaman besar di-lazy load lewat `src/app/router/lazyPages.tsx`.

---

## 12. UI/UX

### 12.1 Prinsip

- Antarmuka adalah alat kerja: padat informasi, tenang, dan konsisten antarmodul.
- Gunakan komponen dan token shadcn/ui serta komponen di `src/components/shared`. Komponen baru dibuat hanya jika belum ada yang sesuai.
- Semua fungsi dapat dipakai dengan keyboard.
- Teks UI dalam Bahasa Indonesia dan spesifik: "Simpan pengguna", bukan "Submit". Hindari teks generik seperti "Selamat datang kembali!" atau "Terjadi kesalahan".
- Dilarang: gradien dekoratif, glassmorphism, card di dalam card, bayangan berlebihan, animasi tanpa fungsi, emoji sebagai ikon, hero section di halaman aplikasi, serta data atau teks contoh yang tertinggal.
- Teks UI tidak memakai em dash, en dash, tanda kutip melengkung, karakter elipsis, titik tengah, atau panah karakter. Gunakan tanda baca ASCII, kata seperti "sampai", atau komponen ikon.

### 12.2 Layout dan navigasi

- Header tetap di atas saat halaman di-scroll. Footer statis di bawah konten berisi hak cipta perusahaan. Jangan membuat container scroll bersarang yang membuat header ikut ter-scroll.
- Halaman yang gagal dirender ditangkap `RouteErrorPage` di dalam layout. Route baru di dalam layout ditempatkan di bawah route tanpa path yang memiliki `errorElement`.
- Header menampilkan breadcrumb dari `handle` route. Route detail dan form mengisi `parents` dengan halaman di atasnya.
- Di lebar tablet (768 sampai 1023 px) sidebar menciut menjadi ikon.
- Halaman form dan detail memakai `CenteredPage` (`max-w-2xl`). Halaman pengaturan dan form kompleks, seperti dokumen transaksi dengan banyak item baris, boleh memakai varian `wide` (`max-w-5xl`) dengan tata letak multi-kolom per bagian. Halaman daftar memakai lebar penuh.

### 12.3 Halaman data

- Setiap halaman data memiliki loading, empty, dan error state, serta responsif.
- Halaman daftar memakai `SearchInput` untuk pencarian dan `FilterBar` untuk filter lain. Di ponsel, filter masuk ke sheet dari bawah, sedangkan pencarian tetap terlihat.
- `DataTable` memiliki pengurutan asc/desc pada kolom yang didukung API, filter jika datanya memungkinkan, dan pilihan jumlah data per halaman 10, 20, 50, dan 100, dengan bawaan 10.
- Di ponsel, `DataTable` menampilkan baris sebagai kartu: kolom pertama menjadi judul, kolom `actions` di sampingnya, dan kolom lain sebagai label dan nilai.
- Tabel harus muat tanpa scroll ke samping mulai 768 px. Jika tidak muat, kolom sekunder diberi `meta: { wideScreenOnly: true }`, dan nilainya tetap tersedia di kartu ponsel dan halaman detail.
- Klik pada baris membuka halaman detail. Tautan di dalam baris tetap ada untuk keyboard, dan tombol aksi di baris tidak ikut memicu klik baris.
- Filter tanggal memakai `DateRangeFilter`: satu field dengan preset Hari ini, 7 hari terakhir, 30 hari terakhir, Bulan ini, dan Semua waktu, serta rentang lain lewat `Calendar`. Klik pertama memulai rentang, klik kedua menutupnya, dan hari setelah hari ini tidak dapat dipilih. Hari dihitung dalam zona waktu perusahaan.

### 12.4 Form

- Setiap resource yang dapat dibuat memiliki halaman form sendiri. Setelah berhasil dibuat, arahkan ke halaman detailnya.
- Form standar memakai `FormCard` satu kolom dengan semua field sama lebar, dapat dikelompokkan dengan `FormSection`, dan aksi di kanan bawah dengan urutan Batal lalu Simpan.
- Setiap field memiliki label dan pesan error sendiri (`FormField`). Tombol submit memakai `loading` selama permintaan berjalan.
- Error yang perlu diperbaiki pengguna ditampilkan di dekat field atau form, bukan hanya di toast.
- Form yang dapat menyimpan memakai `useUnsavedChangesGuard`. Panggil `allowNavigation()` sebelum redirect setelah berhasil menyimpan.
- Relasi yang dapat diatur, seperti role pengguna, diisi di form yang sama dan disimpan dalam satu transaksi.
- Halaman pengaturan dikelompokkan dalam tab per bagian. Setiap bagian memiliki tombol simpan sendiri yang nonaktif selama belum ada perubahan.

### 12.5 Konfirmasi dan umpan balik

- Aksi destruktif membutuhkan konfirmasi yang menyebut objek yang terdampak. Gunakan `ConfirmDialog`, yang tetap terbuka dan tidak dapat ditutup selama permintaan berjalan.
- Toast hanya untuk umpan balik singkat dan muncul di kanan atas, dengan varian `success`, `info`, `warning`, atau `error` yang masing-masing memiliki ikon tetap. Maksimal satu aksi per toast.
- Error dari `notifyError` bertahan 8 detik, dan error server menyertakan kode permintaan. Informasi di toast harus tetap bisa ditemukan di halaman setelah toast hilang.

### 12.6 Spasi

Berlaku untuk `src/features/*` dan `src/components/shared`. Komponen `src/components/ui` mengikuti shadcn/ui. Spasi memakai skala Tailwind (1 unit = 4 px). Nilai `gap` di dalam layout aplikasi hanya `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, dan `4`. Nilai arbitrary seperti `gap-[18px]` tidak dipakai.

| Tempat | Kelas |
|---|---|
| Padding konten halaman | `p-4 md:p-6`, sudah diberikan `AppLayout`. Halaman tidak menambah padding luar. |
| Antarblok di halaman: `PageHeader`, toolbar, tabel, kartu | `gap-4` |
| Grid kartu | `gap-4` |
| Toolbar pencarian dan filter | `gap-2` |
| Antarfield di `FormCard` dan bagian pengaturan | `gap-4` |
| Antarbagian di dalam form (`FormSection`) | `gap-4`, pemisah `border-t pt-4` |
| Antarfield di form halaman masuk | `gap-3` |
| Label, field, petunjuk, dan error dalam `FormField` | `gap-1.5` |
| Judul dan deskripsi yang bertumpuk | `gap-0.5` |
| Ikon dan teks dalam satu baris, tombol yang berderet | `gap-2` |
| Avatar atau logo dan nama | `gap-2.5` sampai `gap-3` |
| Isi kartu | `p-5`. Baris aksi di bawah kartu `px-5 py-3` dengan `border-t`. |
| Daftar label dan nilai (`dl`) | `gap-y-3`, kolom label `sm:grid-cols-[9rem_1fr]` |
| Empty dan error state | `p-8`, `gap-2`, rata tengah |

Kartu halaman masuk memakai `max-w-md`, dan `SearchInput` memakai `sm:max-w-xs`. Halaman di luar layout aplikasi (`AuthLayout` dan 404) boleh memakai spasi lebih besar (`gap-6` sampai `gap-10`, `p-10`).

### 12.7 Tipografi

Font aplikasi Geist Variable melalui token `--font-sans`. Ukuran teks hanya dari skala Tailwind, tanpa nilai arbitrary.

| Peran | Kelas |
|---|---|
| Judul halaman (`h1`), satu per halaman, melalui `PageHeader` | `text-2xl font-semibold tracking-tight` |
| Judul halaman error di dalam layout | `text-xl font-semibold tracking-tight` |
| Judul bagian atau kartu (`h2`, `CardTitle`) | `text-sm font-semibold` |
| Deskripsi halaman | `text-sm text-muted-foreground` |
| Teks isi, sel tabel, nilai field | `text-sm` |
| Teks pendukung: deskripsi bagian, petunjuk field, waktu, metadata | `text-xs text-muted-foreground` |
| Pesan error field | `text-xs text-destructive` |
| Kode teknis: nama event, key konfigurasi | `font-mono text-xs` |
| Angka statistik di `StatTile` | `text-3xl font-semibold tracking-tight tabular-nums` |

`font-semibold` untuk judul, `font-medium` untuk nama, nilai penting, dan judul empty state. `font-bold` tidak dipakai. Warna teks memakai token `foreground`, `muted-foreground`, `destructive`, dan token status. Warna Tailwind mentah hanya jika sengaja meniru latar di luar tema, misalnya latar logo.

---

## 13. Testing

### 13.1 Kewajiban

- Perubahan perilaku disertai test. Bug fix diawali test yang mereproduksi bug.
- Setiap endpoint diuji 2xx, 401, 403, dan 422, ditambah data scope (resource di luar scope menghasilkan 404) dan privilege escalation jika relevan.
- Setiap endpoint daftar ditambahkan ke `QueryCountTest`.
- Test harus gagal ketika perilakunya rusak. Jangan menulis test yang hanya menguji mock atau perilaku framework.
- Test menyiapkan datanya sendiri dengan factory, tidak bergantung pada urutan, dan tidak memakai data production.
- Layanan eksternal (email, HTTP) di-fake. Antrian dijalankan sync di test.

### 13.2 Test yang menjaga standar

| Test | Gagal jika |
|---|---|
| `Core/RouteProtectionTest` | Route tidak tercatat di bagian 17, atau middleware-nya tidak sesuai kolom Akses |
| `Core/ApiDocumentationTest` | Endpoint di OpenAPI berbeda dari tabel API di bagian 17 |
| `Core/AuthorizationMatrixTest` | Endpoint terlindungi tidak menolak tamu (401) atau user tanpa permission (403), atau permission role hasil seed berbeda dari bagian 18 |
| `PermissionCatalogTest` | Katalog permission tidak valid atau berbeda dari daftar yang diharapkan |
| `Core/Audit/AuditCoverageTest` | Aksi sensitif tidak tercatat tepat sekali atau mencatat secret |
| `Core/QueryCountTest` | Jumlah query endpoint daftar bertambah mengikuti jumlah baris |
| `Database/SchemaTest` | Password atau token ikut serialisasi model |

### 13.3 Environment test

- Backend memakai database MySQL khusus `laravel_base_test`, terpisah dari database development.
- Frontend memakai Vitest, Testing Library, dan MSW. Handler bawaan ada di `src/test/server.ts`. Di Windows, jalankan Vitest dari PowerShell.
- E2E Playwright ada di `frontend/e2e` dan dijalankan dengan `npm run test:e2e`. Playwright menyalakan backend di port 8011 dan frontend hasil build di port 5173, mengosongkan `laravel_base_test`, lalu mengisinya dengan `E2ESeeder`. Butuh Chromium dari `npx playwright install chromium`.
- E2E mencakup alur kritis: login sampai logout dan proteksi CSRF. Alur kritis modul bisnis ditambahkan di sini.

---

## 14. Kualitas, CI, dan Git

### 14.1 Pemeriksaan sebelum menyatakan selesai

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

Laporkan hasilnya apa adanya. Jika ada yang gagal atau tidak dapat dijalankan, sebutkan.

### 14.2 CI

CI (`.github/workflows/ci.yml`) menjalankan:

- Backend: Pint, PHPStan, `composer audit`, migration, test, export OpenAPI, dan pemeriksaan bahwa `api.d.ts` sesuai hasil generate.
- Frontend: lint, format, type-check, test, build, dan `npm audit --audit-level=high`.
- E2E: Playwright.

### 14.3 Dependency

Tambahkan dependency hanya jika framework atau package yang ada tidak cukup. Method dan konfigurasi package diverifikasi pada versi yang terpasang.

### 14.4 Git

- Branch pendek per pekerjaan: `feature/*`, `bugfix/*`, `hotfix/*`. `main` selalu siap rilis.
- Commit memakai Conventional Commits: `feat(user): add user deactivation`. Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.
- Perubahan ke `main` melalui pull request yang menjelaskan masalah, solusi, modul terdampak, migration, perubahan API, dampak keamanan, bukti test, dan screenshot untuk perubahan UI.

### 14.5 Definition of Done

- Business rule dan acceptance criteria terpenuhi.
- Alur backend sesuai bagian 3, dengan validasi, otorisasi, scope data, transaksi, dan audit log jika relevan.
- Frontend memiliki loading, empty, dan error state, validasi form, dan sudah diperiksa di ponsel, tablet, dan desktop.
- Test sesuai bagian 13 ada dan lulus, bersama seluruh pemeriksaan di bagian 14.1.
- Route tercatat di bagian 17, permission di bagian 18, endpoint berisiko di bagian 6, dan error code baru di bagian 5.4.
- Tipe API frontend digenerate ulang. Migration tersedia untuk perubahan skema.
- Tidak ada secret di kode, dan standar ini diperbarui jika ada keputusan baru.

---

## 15. Deployment dan Operasional

Baseline yang wajib dipenuhi sebelum aplikasi dipakai di production:

| Area | Standar |
|---|---|
| Environment | Local, testing, staging, dan production terpisah, dengan credential berbeda. Rilis diuji di staging sebelum production. |
| Konfigurasi | `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` HTTPS, `SESSION_SECURE_COOKIE=true`, `SANCTUM_STATEFUL_DOMAINS` sesuai domain, trusted proxy benar |
| Secret | Di luar repository. Dirotasi jika bocor. |
| Transport | HTTPS dengan HSTS |
| Header | `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP tanpa `unsafe-eval`, dan `frame-ancestors` |
| Infrastruktur | Docker Compose. MySQL dan Redis hanya di jaringan privat. User database aplikasi bukan root. |
| Proses | Queue worker dan scheduler berjalan dan dimonitor. `php artisan migrate --force` dijalankan lewat pipeline. |
| Observabilitas | Health check `/api/v1/health` dan `/up`, error tracking, log dengan `request_id` |
| Backup | Backup database dan file harian terenkripsi, disimpan di luar server, dengan uji restore berkala |
| Rollback | Image rilis sebelumnya dapat dijalankan ulang. Migration berisiko memakai expand-and-contract agar versi lama tetap berjalan. |

---

## 16. Langkah Menambah Modul

1. Pastikan modul masuk cakupan, dan putuskan hal yang belum jelas sebelum menulis kode.
2. Rancang tabel (bagian 4) dan endpoint (bagian 5). Tandai endpoint yang memerlukan idempotency key atau optimistic locking (bagian 6).
3. Buat folder modul (bagian 2), `permissions.php` (bagian 8.3), dan `module.php` jika ada menu (bagian 10.1).
4. Implementasikan migration, model, Form Request, Policy, Action, Resource, controller, dan route.
5. Catat audit event baru di `AuditEvent` (bagian 9.4), dan error code baru di bagian 5.4.
6. Tambahkan route ke bagian 17 dan permission ke bagian 18. Perbarui `PermissionCatalogTest`.
7. Tulis test backend (bagian 13), lalu generate ulang tipe API (bagian 5.6).
8. Buat feature frontend (bagian 11) dengan halaman yang mengikuti bagian 12, beserta test-nya.
9. Jalankan pemeriksaan di bagian 14.1.

---

## 17. Daftar Endpoint

Tabel ini adalah daftar endpoint yang terpasang. `RouteProtectionTest` dan `ApiDocumentationTest` membacanya, sehingga setiap route baru wajib dicatat di sini.

| Akses | Arti |
|---|---|
| Publik | Tanpa login |
| Login | Wajib login, tanpa permission khusus. Data yang dikembalikan milik user itu sendiri. |
| Lokal | Hanya tersedia di environment `local` |
| `{resource}.{action}` | Wajib login dan memiliki permission tersebut |

Nama parameter path tidak dibandingkan, sehingga `{id}` di tabel cocok dengan `{user}` di route.

### API (`/api/v1`)

| Method | Endpoint | Akses |
|---|---|---|
| GET | /health | Publik |
| GET | /auth/user | Login |
| POST | /auth/forgot-password | Publik |
| POST | /auth/reset-password | Publik |
| POST | /auth/change-password | Login |
| GET | /auth/sessions | Login |
| DELETE | /auth/sessions | Login |
| DELETE | /auth/sessions/{id} | Login |
| POST | /auth/email-change/confirm | Publik |
| GET | /account | Login |
| PATCH | /account | Login |
| GET | /account/avatar | Login |
| POST | /account/avatar | Login |
| DELETE | /account/avatar | Login |
| POST | /account/email | Login |
| DELETE | /account/email | Login |
| GET | /users | user.view |
| POST | /users | user.create |
| GET | /users/{id} | user.view |
| PATCH | /users/{id} | user.update |
| DELETE | /users/{id} | user.delete |
| GET | /users/{id}/avatar | user.view |
| GET | /users/{id}/roles | user.view |
| GET | /users/{id}/permissions | user.view |
| PUT | /users/{id}/roles | user.assign_role |
| GET | /roles | role.view |
| POST | /roles | role.create |
| GET | /roles/{id} | role.view |
| PATCH | /roles/{id} | role.update |
| DELETE | /roles/{id} | role.delete |
| GET | /roles/{id}/permissions | role.view |
| PUT | /roles/{id}/permissions | permission.assign |
| GET | /permissions | permission.view |
| GET | /audit-logs | audit.view |
| GET | /audit-logs/{id} | audit.view |
| GET | /system-configurations | system_config.view |
| GET | /system-configurations/public | Publik |
| GET | /system-configurations/feature-flags | system_config.feature_flags |
| GET | /system-configurations/{key} | system_config.view |
| PATCH | /system-configurations/{key} | system_config.update |
| GET | /branding | Publik |
| GET | /branding/{asset} | Publik |
| POST | /branding/{asset} | system_config.update |
| DELETE | /branding/{asset} | system_config.update |
| GET | /navigation | Login |
| GET | /navigation/layout | system_config.update |
| PUT | /navigation/layout | system_config.update |
| GET | /modules | system_config.feature_flags |
| PUT | /modules | system_config.feature_flags |
| GET | /notifications | Login |
| GET | /notifications/unread-count | Login |
| PATCH | /notifications/{id}/read | Login |
| POST | /notifications/read-all | Login |

### Di luar `/api/v1`

| Method | Endpoint | Akses |
|---|---|---|
| GET | /sanctum/csrf-cookie | Publik |
| POST | /login | Publik |
| POST | /logout | Login |
| GET | /up | Publik |
| GET | /docs/api | Lokal |
| GET | /docs/api.json | Lokal |
| GET | /_scramble/dev-tools/devtools.js | Lokal |

`/up` adalah health check bawaan Laravel untuk load balancer dan tidak memuat data aplikasi.

---

## 18. Matriks Permission

Permission yang dimiliki setiap role hasil `RolePermissionSeeder`. `AuthorizationMatrixTest` gagal jika seeder berbeda dari tabel ini atau ada permission di katalog yang tidak tercatat. `Ya` berarti diberikan, `-` berarti tidak. Role yang ditambahkan admin sebagai data tidak tercatat di sini.

### Pengguna

| Permission | Super Admin | Admin | Staff | Viewer |
|---|---|---|---|---|
| user.view | Ya | Ya | Ya | Ya |
| user.create | Ya | Ya | - | - |
| user.update | Ya | Ya | - | - |
| user.delete | Ya | Ya | - | - |
| user.assign_role | Ya | Ya | - | - |

### Role dan permission

| Permission | Super Admin | Admin | Staff | Viewer |
|---|---|---|---|---|
| role.view | Ya | Ya | - | - |
| role.create | Ya | - | - | - |
| role.update | Ya | - | - | - |
| role.delete | Ya | - | - | - |
| permission.view | Ya | Ya | - | - |
| permission.assign | Ya | - | - | - |

### Pengaturan sistem

| Permission | Super Admin | Admin | Staff | Viewer |
|---|---|---|---|---|
| system_config.view | Ya | Ya | - | - |
| system_config.update | Ya | Ya | - | - |
| system_config.feature_flags | Ya | - | - | - |

Admin hanya menjangkau key berawalan `company.` dan `localization.` (bagian 8.4).

### Audit log

| Permission | Super Admin | Admin | Staff | Viewer |
|---|---|---|---|---|
| audit.view | Ya | Ya | - | - |

Admin tidak melihat record konfigurasi di luar prefix yang diizinkan baginya.
