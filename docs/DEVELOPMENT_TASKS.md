# Development Tasks: Base v1

Pecahan pekerjaan untuk modul Base v1 sesuai `README.md`: Authentication, User Management, Role & Permission, Audit Log, System Configuration, dan `/health`.

Ukuran: **S** kurang dari setengah hari, **M** sekitar satu hari, **L** dua sampai tiga hari. Angka ini perkiraan awal dan perlu disesuaikan dengan kapasitas tim.

## Aturan

- Kerjakan berurutan per fase. Task dalam satu fase boleh paralel jika dependensinya sudah selesai.
- Satu task menghasilkan satu Pull Request.
- Task endpoint selesai jika diuji 2xx, 401, 403, dan 422 sesuai kasusnya, serta Pint dan PHPStan lulus.
- Task frontend selesai jika loading, empty, dan error state tersedia, serta lint, type-check, dan test lulus.
- Perubahan terhadap `docs/` dilakukan dalam PR yang sama dengan implementasinya.

Status: `Todo`, `Doing`, `Done`, `Blocked`.

## Urutan Fase

```text
0 Setup → 1 Fondasi → 2 Data → 3 Authentication → 4 Authorization
                                                      ↓
          8 System Config ← 7 Audit API ← 6 User
                 ↓
9 Frontend Shell → 10 Frontend Modul → 11 Verifikasi → 12 Deployment
```

Fase 9 boleh dimulai setelah fase 3 selesai, dan task fase 10 mengikuti endpoint backend-nya.

## Fase 0: Setup

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-001 | Inisialisasi git, `.gitignore`, folder `backend/` dan `frontend/` | S | - | `.env` dan `vendor/` tidak ter-track | Done |
| T-002 | Pasang Laravel 13 dengan PHP 8.4, MySQL `utf8mb4_unicode_ci`, timezone UTC, `.env.example` | M | T-001 | Migration bawaan berjalan di MySQL lokal | Done |
| T-003 | Pasang Sanctum, Spatie Permission, Activitylog, Scramble, Pest, Larastan, Pint; pastikan kompatibel dengan Laravel 13 | S | T-002 | `composer audit`, Pint, PHPStan, dan Pest berjalan | Done |
| T-004 | Struktur `app/Core`, `app/Modules`, `app/Shared` dan pemuatan route per modul dengan prefix `/api/v1` | M | T-002 | Route di `Modules/*/Routes/api.php` terdaftar otomatis | Done |
| T-005 | Pasang React, TypeScript strict, Vite, Tailwind, shadcn/ui, React Router, TanStack Query, Zustand, React Hook Form, Zod, Axios, ESLint, Prettier, Vitest, Testing Library, MSW, Playwright | M | T-001 | Lint, type-check, test, dan build berjalan | Done |
| T-006 | Proxy Vite untuk `/api`, `/sanctum`, `/login`, dan `/logout` agar development meniru satu domain | S | T-002, T-005 | Frontend lokal dapat memanggil Laravel tanpa CORS | Done |
| T-007 | CI: Pint, PHPStan, test backend dengan MySQL, lint, type-check, test frontend, build, `composer audit`, `npm audit` | M | T-003, T-005 | Pipeline berjalan pada setiap PR | Done |

## Fase 1: Fondasi Backend

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-101 | Response layer untuk format `success`, `message`, `data`, `errors`, `meta` | S | T-004 | Response tunggal, koleksi, dan pagination sesuai kontrak | Done |
| T-102 | Exception handler ke 400, 401, 403, 404, 409, 422, 429, 500 dengan `code` dan request ID | M | T-101 | Production tidak menampilkan stack trace atau SQL | Done |
| T-103 | Pagination (default 20, maksimum 100) serta filter dan sorting berbasis allowlist | S | T-101 | Kolom di luar allowlist ditolak | Done |
| T-104 | Trait UUID: generate `uuid`, route key memakai `uuid` | S | T-004 | Model dapat diakses lewat UUID dan tidak lewat ID internal | Done |
| T-105 | Dukungan optimistic locking dengan code `RESOURCE_VERSION_CONFLICT` | S | T-102 | `version` lama menghasilkan 409 tanpa mengubah data | Done |
| T-106 | Konfigurasi Sanctum SPA, session database, cookie aman, Argon2id | S | T-003 | Hash password memakai Argon2id, cookie HttpOnly | Done |
| T-107 | Rate limiter login dan API standar | S | T-004 | Percobaan login berlebih mendapat 429 | Done |
| T-108 | Pencatat audit terpusat di `app/Core/Audit` dengan pembersihan field sensitif | M | T-003 | Password, token, dan session tidak pernah tersimpan | Done |
| T-109 | Endpoint `GET /api/v1/health` | S | T-101 | Hanya mengembalikan status minimum | Done |
| T-110 | OpenAPI dengan Scramble | S | T-101 | Dokumentasi tergenerate dari route yang ada | Done |

## Fase 2: Data

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-201 | Migration `users`: `uuid`, `is_active`, `last_login_at`, `deleted_at` | S | T-002 | Sesuai `DATABASE_DESIGN.md` | Done |
| T-202 | Migration `departments` dan `users.department_id` | S | T-201 | Foreign key dan unique `code` teruji | Done |
| T-203 | Migration package, `version` pada `roles`, dan guard `web` | S | T-003 | Tidak ada tabel ganda | Done |
| T-204 | Migration `system_configurations` | S | T-002 | Sesuai `DATABASE_DESIGN.md` | Done |
| T-205 | Factory untuk User, Department, dan SystemConfiguration | S | T-202, T-204 | Dapat dipakai di test | Done |
| T-206 | Seeder 19 permission Base v1 dan role Super Admin, Admin, Staff, Viewer | M | T-203 | Isi role cocok dengan `AUTHORIZATION_MATRIX.md` | Done |
| T-207 | Seeder department dan konfigurasi awal termasuk profil perusahaan | S | T-202, T-204 | Dapat dijalankan berulang tanpa data ganda | Done |
| T-208 | Command pembuatan Super Admin pertama dengan input password | S | T-206 | Tidak ada password default di kode atau seeder | Done |

Permission Base v1: `user.view`, `user.create`, `user.update`, `user.delete`, `user.assign_role`, `role.view`, `role.create`, `role.update`, `role.delete`, `permission.view`, `permission.assign`, `system_config.view`, `system_config.update`, `system_config.feature_flags`, `audit.view`.

## Fase 3: Authentication

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-301 | `POST /login` | M | T-106, T-107, T-108, T-201 | Pesan gagal generik, user nonaktif ditolak, session diregenerasi, `last_login_at` terisi, login berhasil dan gagal tercatat | Done |
| T-302 | `POST /logout` | S | T-301 | Session tidak dapat dipakai lagi | Done |
| T-303 | `GET /auth/user` | S | T-301, T-206 | Mengembalikan role dan permission tanpa field sensitif | Done |
| T-304 | `POST /auth/forgot-password` dan `POST /auth/reset-password` | M | T-301 | Respons tidak mengungkap email terdaftar, token sekali pakai dan kedaluwarsa, session lama diakhiri | Done |
| T-305 | `POST /auth/change-password` | S | T-301 | Password lama diverifikasi, minimal 12 karakter, password bocor ditolak | Done |

## Fase 4: Authorization

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-401 | `UserAccessService` dan query scope `visibleTo` pada User | M | T-202, T-206 | Super Admin dan Admin melihat semua user; role lain hanya akunnya sendiri | Done |
| T-402 | `GET /permissions`, `GET /roles`, `GET /roles/{id}`, `GET /roles/{id}/permissions` | S | T-206 | Sesuai matriks | Done |
| T-403 | `POST /roles`, `PATCH /roles/{id}`, `DELETE /roles/{id}` | M | T-402 | Role yang masih dipakai dan role bawaan tidak dapat dihapus | Done |
| T-404 | `PUT /roles/{id}/permissions` | M | T-105, T-402 | Memakai `version`, permission tidak terdaftar ditolak, tidak dapat memberi di luar kewenangan, cache dibersihkan, tercatat di audit | Done |
| T-405 | Konfigurasi role yang boleh diberikan oleh tiap role | S | T-206 | Admin tidak dapat memberikan Super Admin | Done |

## Fase 5: Department (dihapus)

Modul Departemen dihapus pada 2026-11-10. Task berikut dibatalkan, dan skemanya dihapus oleh migration `remove_departments`.

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-501 | `GET /departments`, `POST /departments`, `GET /departments/{id}`, `PATCH /departments/{id}` | M | T-401 | `parent_id` memakai UUID, kode duplikat ditolak | Done |
| T-502 | Validasi hierarchy | S | T-501 | Circular reference ditolak | Dibatalkan |
| T-503 | `DELETE /departments/{id}` | S | T-501 | Departemen yang memiliki user atau sub-departemen ditolak | Dibatalkan |
| T-504 | `GET /departments/{id}/users` | S | T-501 | Mengikuti `visibleTo` | Dibatalkan |

## Fase 6: User Management

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-601 | `GET /users` dan `GET /users/{id}` dengan filter dan search | M | T-103, T-401 | User di luar scope mendapat 404 | Done |
| T-602 | `POST /users` | M | T-601 | Email unik, password tidak pernah dikembalikan, tercatat di audit | Done |
| T-603 | `PATCH /users/{id}` termasuk `status` | M | T-601 | Perubahan tercatat | Done |
| T-604 | `DELETE /users/{id}` sebagai deaktivasi | M | T-601 | Session user berakhir, tidak dapat menonaktifkan diri sendiri atau Super Admin terakhir | Done |
| T-605 | `GET /users/{id}/roles` dan `PUT /users/{id}/roles` | M | T-405, T-601 | Privilege escalation ditolak, tercatat di audit | Done |

## Fase 7: Audit Log

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-701 | `GET /audit-logs` dan `GET /audit-logs/{id}` dengan filter user, modul, tanggal, dan aksi | M | T-108 | Tidak ada endpoint ubah atau hapus | Done |
| T-702 | Test bahwa login, perubahan user, role, permission, dan konfigurasi tercatat | S | T-605, T-701 | Setiap aksi menghasilkan satu record tanpa secret | Done |

## Fase 8: System Configuration

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-801 | `GET /system-configurations` dan `GET /system-configurations/{key}` | S | T-204 | Nilai `is_sensitive` tidak pernah dikirim | Done |
| T-802 | `PATCH /system-configurations/{key}` | M | T-105, T-801 | Memakai `version`, nilai sensitif terenkripsi, tercatat di audit dan masuk `AuditCoverageTest` | Done |
| T-803 | `GET /system-configurations/public` dan `GET /system-configurations/feature-flags` | S | T-801 | Route terdaftar sebelum `{key}`, `public` hanya berisi `is_public` | Done |

## Fase 9: Frontend Shell

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-901 | Axios client, inisialisasi CSRF, dan penanganan 401, 403, 404, 409, 422, 429 | M | T-006, T-101 | Error 422 terhubung ke field form | Done |
| T-902 | Tipe TypeScript dari OpenAPI | S | T-110, T-005 | Type-check gagal jika kontrak berubah | Done |
| T-903 | Auth store, `usePermission`, `ProtectedRoute` | M | T-303, T-901 | Route mengikuti permission dari backend | Done |
| T-904 | Layout aplikasi, menu sesuai permission, halaman awal, 403, 404 | M | T-903 | Responsif dan dapat dipakai dengan keyboard | Done |
| T-905 | Komponen bersama: DataTable, pagination, FormField, ConfirmDialog, loading, empty, error, toast | L | T-005 | Dipakai oleh semua modul | Doing |
| T-906 | Tema terang dan gelap, warna aksen dan status, penyelarasan layout | M | T-904, T-905 | Kontras token minimal 4,5:1 untuk teks dan 3:1 untuk kontrol di kedua tema, tema benar sebelum render pertama | Done |
| T-907 | Arah visual A: latar berlapis, panel, identitas, Beranda berisi data dari API, login dua kolom | M | T-906, T-1001 | Kontras token memenuhi syarat di kedua tema, Beranda mengikuti permission | Done |
| T-908 | Skeleton sesuai bentuk konten: tabel, daftar, form, halaman, kerangka aplikasi | S | T-905 | Loading state menyerupai konten dan menyebut objek yang dimuat | Done |
| T-909 | Breadcrumb di header, diisi dari data rute | S | T-906 | Halaman detail menampilkan lokasi dan tautan ke induknya | Todo |
| T-910 | Komponen modal umum (`Dialog`) untuk form singkat | S | T-905 | Fokus terkunci di dalam modal dan kembali ke pemicunya | Todo |
| T-911 | Sidebar menciut otomatis di lebar tablet | S | T-906 | Tabel mempunyai ruang cukup di lebar 768 px | Todo |
| T-912 | Aturan skala spasi dan tipografi di `DEVELOPMENT_GUIDELINE.md` | S | T-907 | Modul baru mengikuti aturan yang tertulis | Todo |

## Fase 10: Frontend Modul

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-1001 | Halaman login, lupa password, reset password | M | T-304, T-903 | Pesan error mengikuti backend | Done |
| T-1002 | Halaman ubah password | S | T-305, T-904 | Error validasi tampil per field | Done |
| T-1004 | User: daftar, filter, detail, form, role, deaktivasi | L | T-605, T-905 | Aksi mengikuti permission | Done |
| T-1005 | Role: daftar, form, pengaturan permission | L | T-404, T-905 | Konflik `version` meminta user memuat ulang data | Done |
| T-1006 | Audit log: daftar, filter, detail | M | T-701, T-905 | Hanya baca | Done |
| T-1007 | Pengaturan sistem | M | T-803, T-905 | Konflik `version` ditangani, nilai sensitif tidak ditampilkan | Done |
| T-1008 | Terjemahkan email reset password ke Bahasa Indonesia | S | T-304 | Subjek dan isi email berbahasa Indonesia dan teruji | Todo |
| T-1009 | Login dengan email atau username, Ingat saya 30 hari, halaman 404 di dalam layout | M | T-1001 | Email dan username tidak peka huruf besar-kecil, cookie Ingat saya batal saat logout, ganti password, dan penonaktifan | Done |
| T-1010 | Kebijakan identifier autentikasi: normalisasi email dan username di semua jalur, constraint database | S | T-1009 | Nilai tidak ternormalisasi ditolak database, duplikat setelah normalisasi ditolak | Done |
| T-1011 | Upload logo, logo latar gelap, dan favicon di Pengaturan, dengan ukuran gambar yang disesuaikan otomatis dan pilihan nama, latar, serta ukuran logo. Tampil di sidebar, halaman login, dan tab browser | M | T-1007 | File privat dengan nama acak, SVG ditolak, path hanya ditulis endpoint upload | Done |

## Fase 11: Verifikasi

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-1101 | Test yang memastikan setiap route terlindungi memiliki middleware autentikasi dan permission | S | Fase 8 | Route baru tanpa proteksi membuat test gagal | Todo |
| T-1102 | Test privilege escalation dan data scope menyeluruh | M | Fase 8 | Semua skenario di `AUTHORIZATION_MATRIX.md` yang relevan lulus | Todo |
| T-1103 | Smoke test login dengan Playwright | S | T-1001 | Login sampai halaman awal berhasil | Todo |
| T-1104 | Cocokkan OpenAPI dengan `API_SPECIFICATION.md` | S | Fase 8 | Tidak ada perbedaan yang belum dicatat | Todo |
| T-1105 | Periksa Security Acceptance Criteria yang relevan | M | Fase 10 | Setiap kriteria memiliki bukti atau catatan | Todo |

## Fase 12: Deployment

| ID | Task | Ukuran | Butuh | Selesai jika | Status |
|---|---|---|---|---|---|
| T-1201 | Image backend `php:8.4-fpm` dengan extension `redis` dan entrypoint `optimize` | M | Fase 8 | Image berjalan sebagai non-root jika memungkinkan | Todo |
| T-1202 | Image frontend multi-stage | S | Fase 10 | `VITE_API_BASE_URL=/api/v1` | Todo |
| T-1203 | Docker Compose dan Nginx satu domain, HTTPS, security headers | L | T-1201, T-1202 | MySQL dan Redis tidak terbuka ke publik | Todo |
| T-1204 | Environment staging dan pengelolaan secret | M | T-1203 | Secret berada di luar repo | Todo |
| T-1205 | Queue worker dan scheduler | S | T-1203 | Job uji diproses dan `retry_after` lebih besar dari timeout | Todo |
| T-1206 | Backup harian terenkripsi dan uji restore | M | T-1204 | Restore berhasil di environment terisolasi dan durasinya tercatat | Todo |
| T-1207 | Error tracking dan log terstruktur | S | T-1204 | Error uji terlihat tanpa data sensitif | Todo |
| T-1208 | Production security checklist dan deployment pertama | M | T-1205, T-1206, T-1207 | Deployment Acceptance Criteria terpenuhi | Todo |

## Tidak Termasuk Base v1

- Token API, daftar sesi aktif, dan email verification.
- MFA. Wajib dikerjakan sebelum aplikasi nyata go-live, minimal untuk akun privileged.
- Import user, export user, dan export audit log.
- Modul Tahap 2 dan Tahap 3 pada `README.md`.
