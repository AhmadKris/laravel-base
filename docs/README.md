# Enterprise System Starter Kit — Documentation Index

Prinsip proyek: **ruang lingkup kecil, standar tidak diturunkan.** Fitur boleh ditunda, tetapi fondasi yang dibangun harus benar sejak awal.

Dokumen spesifikasi berisi rancangan lengkap. Tabel di bawah menentukan bagian yang dibangun lebih dulu.

## Cakupan Implementasi

| Tahap | Modul | Kapan |
|---|---|---|
| **Base v1** | Authentication, User Management, Role & Permission, Department, Audit Log, System Configuration, `/health` | Sekarang |
| **Tahap 2** | Notification, Document, Workflow | Saat modul bisnis pertama membutuhkannya |
| **Tahap 3** | Master Data, Reporting, Integration, Monitoring lanjutan | Berdasarkan kebutuhan nyata |

## Standar Base v1

### Wajib ada

| Area | Standar |
|---|---|
| Identifier | `id` BIGINT internal dan `uuid` untuk API |
| Data | Migration, foreign key, transaksi, dan `department_id` pada data yang perlu scope |
| Otorisasi | Permission di backend, Policy per resource, query data scope, deny by default |
| API | `/api/v1`, Form Request, API Resource, format response dan error `code` seragam, pagination, optimistic locking pada `PUT /roles/{id}/permissions` dan `PATCH /system-configurations/{key}` |
| Autentikasi | Sanctum SPA cookie, CSRF, rate limit login, password reset, session regeneration, Argon2id |
| Audit | Spatie Activitylog untuk login, perubahan user, role, permission, dan konfigurasi; tanpa secret |
| Kualitas kode | Controller → Action → Model; Pint, PHPStan, ESLint, TypeScript strict |
| Testing | Tiap endpoint diuji 2xx/401/403/422, pembatasan data scope, privilege escalation, satu smoke test login |
| CI | Formatting, static analysis, test, build, `composer audit`, `npm audit` |
| Deployment | Docker Compose, HTTPS, security headers, `APP_DEBUG=false`, secret di luar repo, MySQL dan Redis privat |
| Operasional | Staging sebelum production, backup harian terenkripsi, uji restore, health check, error tracking |
| Dokumentasi API | OpenAPI digenerate dengan Scramble |

Service hanya dibuat jika logikanya dipakai ulang. Repository, Contract, dan DTO hanya dibuat jika ada kebutuhan nyata.

### Sengaja ditunda

| Area | Ditunda | Ditambahkan saat |
|---|---|---|
| Autentikasi | Token API, daftar sesi aktif, email verification | Ada klien eksternal atau kebutuhan bisnis |
| MFA | Enrollment dan recovery | Sebelum aplikasi nyata go-live, minimal untuk akun privileged |
| Workflow | Builder, delegasi, eskalasi, UI versioning | Setelah approval berurutan terpakai |
| Document | Versioning, preview, malware scanning | Setelah upload dasar terpakai |
| Tabel | `security_events`, `idempotency_keys`, `document_references`, `notification_deliveries` | Fitur terkait dibangun; event keamanan masuk `activity_log` |
| Security | Matriks ASVS per requirement, DAST, Trivy, SBOM, penetration test | Sebelum rilis aplikasi bisnis |
| Testing | Target coverage sebagai gate, load test, UAT formal | Aplikasi bisnis mendekati rilis |
| Backup | Binlog dan target RPO 15 menit | Kebutuhan bisnis menuntutnya |
| Struktur | Multi-company dan branch | Perusahaan benar-benar membutuhkannya; perlu migrasi untuk menambahkan organisasi pada data yang sudah ada |

## Daftar Dokumen dan Sumber Kebenaran

Jika dua dokumen berbeda, dokumen yang menjadi sumber kebenaran untuk topik tersebut yang berlaku.

| Dokumen | Sumber kebenaran untuk |
|---|---|
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Arsitektur, layer, dan technology stack |
| [MODULE_SPECIFICATION.md](MODULE_SPECIFICATION.md) | Tanggung jawab modul, business rule, dan status workflow |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | Tabel, kolom, relasi, index, dan migration |
| [API_SPECIFICATION.md](API_SPECIFICATION.md) | Endpoint, field API, format response, dan error code |
| [AUTHORIZATION_MATRIX.md](AUTHORIZATION_MATRIX.md) | Role, permission, dan data scope |
| [SECURITY_SPECIFICATION.md](SECURITY_SPECIFICATION.md) | Kontrol keamanan dan verifikasi ASVS |
| [DEVELOPMENT_GUIDELINE.md](DEVELOPMENT_GUIDELINE.md) | Coding standard dan struktur folder |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Strategi dan kriteria pengujian |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Deployment, operasional, backup, dan rollback |
| [DEVELOPMENT_TASKS.md](DEVELOPMENT_TASKS.md) | Pecahan pekerjaan dan status Base v1 |

## Keputusan yang Berlaku

| Topik | Keputusan |
|---|---|
| PHP | 8.4.x |
| Struktur backend | `app/Core`, `app/Modules`, `app/Shared` |
| Model perusahaan | Satu perusahaan per instalasi, tanpa company, branch, atau tabel `organizations`; profil perusahaan disimpan di `system_configurations` |
| Keanggotaan user | Untuk saat ini maksimal satu departemen melalui `users.department_id` |
| Role | Global per user, tanpa Spatie teams; departemen membatasi data |
| Seed role Base v1 | Super Admin, Admin, Staff, Viewer |
| Identifier API | `id` berisi UUID, kecuali `roles` dan `permissions` |
| Format permission | `{resource}.{action}`, singular, snake_case |
| Guard permission | `web` |
| HTTP method update | PATCH; PUT hanya untuk mengganti seluruh daftar, seperti role atau permission |
| Resource di luar scope | HTTP 404 |
| Notifikasi | Laravel Database Notifications |
| Topologi | Satu domain: `/` untuk frontend dan `/api` untuk Laravel |
| Password hashing | Argon2id |
| Cache dan queue | Redis di staging dan production; local boleh memakai driver database |
| Workflow revision | Approver dapat mengembalikan pengajuan untuk diperbaiki; setelah diajukan ulang, approval dimulai lagi dari step pertama |
| Pembatalan workflow | Requester boleh membatalkan selama belum ada keputusan approve atau reject pada pengajuan berjalan; Super Admin boleh membatalkan instance aktif |
| Idempotency key | Hanya pada endpoint yang terdaftar di `API_SPECIFICATION.md` bagian 12.1; Base v1 belum memilikinya |
| Optimistic locking | Hanya pada endpoint yang terdaftar di `API_SPECIFICATION.md` bagian 12.2 |

## Spesifikasi yang Belum Tersedia

- Endpoint API untuk modul Integration dan Monitoring lanjutan.
- Skema tabel Master Data per domain.
- Dokumen lanjutan: `WORKFLOW_ENGINE.md`, `OWASP_ASVS_CHECKLIST.md`, `MODULE_TEMPLATE.md`, `CI_CD_GUIDELINE.md`.
