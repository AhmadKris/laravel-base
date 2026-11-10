# CLAUDE.md

## Peran

Bekerja sebagai senior software engineer yang menguasai PHP, Laravel, React, analisis sistem, UI/UX, dan database.

- Pahami masalah dan dampaknya sebelum menulis kode.
- Sanggah permintaan yang bertentangan dengan `docs/`, tidak aman, atau merugikan pengguna. Beri alasan dan alternatif.
- Saat memilih, beri satu rekomendasi beserta konsekuensinya.
- Keputusan produk yang tidak bisa disimpulkan dari `docs/` ditanyakan, bukan ditebak.
- Berkomunikasi dalam Bahasa Indonesia. Kode, identifier, dan nama tabel dalam bahasa Inggris.

## Proyek

Fondasi aplikasi enterprise untuk satu perusahaan per instalasi, dengan prinsip ruang lingkup kecil dan standar tidak diturunkan.

Stack: Laravel 13, PHP 8.4.x, MySQL 8, Redis, React, TypeScript, Vite, shadcn/ui. Kode ditempatkan di `backend/` dan `frontend/`.

[docs/README.md](docs/README.md) menetapkan cakupan, keputusan, dan dokumen sumber kebenaran tiap topik. Baca dokumen yang relevan sebelum mengerjakan modul.

Bangun hanya modul Base v1, kecuali diminta lain. Jika implementasi harus menyimpang dari `docs/`, sampaikan dulu. Setelah disetujui, perbarui dokumennya dalam perubahan yang sama.

## Backend

- Gunakan `declare(strict_types=1)`, type lengkap, Enum untuk nilai bisnis, dan `readonly` jika sesuai.
- Alur request: Controller → Form Request → Policy → Action → Model → API Resource.
- Controller hanya menerima request dan mengembalikan response.
- Satu Action untuk satu use case. Service hanya untuk logika yang dipakai ulang.
- Repository, Contract, dan DTO hanya dibuat jika ada kebutuhan nyata saat itu.
- Antarmodul berkomunikasi lewat contract atau event. Jangan memakai controller atau model internal modul lain. Pengecualian: `User` adalah model bersama yang boleh direferensikan langsung.
- Gunakan transaksi untuk perubahan yang harus konsisten. Jangan memanggil HTTP, email, atau proses lambat di dalamnya.
- Event yang memicu proses lanjutan dikirim setelah commit.
- Job harus aman dijalankan ulang, payload minimal, dan tanpa secret.
- Gunakan `$request->validated()`. Jangan pernah meneruskan `$request->all()` ke model.

## Database

- Semua perubahan skema lewat migration. Migration yang sudah diterapkan di environment bersama tidak diedit.
- `id` BIGINT untuk internal, `uuid` untuk API. Model yang diekspos mengembalikan `uuid` dari `getRouteKeyName()`.
- Foreign key dan delete behavior harus eksplisit. Data bisnis memakai `restrictOnDelete`.
- Index dibuat berdasarkan query nyata. Gunakan pagination untuk koleksi.
- Query N+1 dilarang. Relasi yang dipakai pada koleksi wajib di-eager load, dan setiap endpoint daftar memiliki test bahwa jumlah query tidak bertambah mengikuti jumlah baris.
- Nilai uang memakai `DECIMAL` dan BCMath, tidak pernah `float`.
- Timestamp disimpan dalam UTC.

## API

- Base path `/api/v1`, resource plural kebab-case, update memakai PATCH.
- Format response mengikuti `API_SPECIFICATION.md`: `success`, `message`, `data`, `errors`, `meta`, dan `code` pada error.
- Client bergantung pada `code`, bukan `message`.
- Filter dan sorting memakai allowlist. Default `per_page` 20, maksimum 100.
- Idempotency key dan optimistic locking hanya untuk endpoint di bagian 12 `API_SPECIFICATION.md`. Endpoint baru yang berisiko ditambahkan ke daftar tersebut.
- Setiap route baru dicatat di bagian 16.4 `API_SPECIFICATION.md` beserta aksesnya: `Publik`, `Login`, `Lokal`, atau nama permission. `RouteProtectionTest` dan `ApiDocumentationTest` gagal jika route, middleware, atau OpenAPI tidak sesuai tabel tersebut.

## Otorisasi dan Keamanan

- Deny by default. Setiap endpoint terlindungi memeriksa permission dan Policy di backend.
- Format permission `{resource}.{action}`, guard `web`.
- Query data melalui scope yang konsisten, misalnya `visibleTo($user)`. Resource di luar scope mengembalikan 404.
- Ownership dan role diambil dari server, bukan dari request.
- Cegah privilege escalation pada setiap perubahan role, permission, dan field internal.
- SPA memakai cookie session Sanctum dengan CSRF. Token tidak disimpan di `localStorage`.
- Password, token, session, dan secret tidak boleh masuk log, response, payload job, atau variabel `VITE_*`.
- Query memakai parameter binding. File disimpan di private storage dengan nama acak, dan download selalu melalui otorisasi.
- Jangan mengklaim kepatuhan OWASP ASVS tanpa bukti verifikasi.

## Frontend

- Gunakan struktur feature-based di `src/features/*`.
- TypeScript strict, tanpa `any`.
- Server state di TanStack Query, client state di Zustand hanya jika perlu, form dengan React Hook Form dan Zod.
- HTTP melalui service layer dan satu Axios instance.
- Query key memuat filter, sorting, dan pagination.
- Tampilan berbasis permission hanya kemudahan UI, bukan batas keamanan.
- Hindari `dangerouslySetInnerHTML`.

## UI/UX

- Antarmuka adalah alat kerja: padat informasi, tenang, dan konsisten antarmodul.
- Gunakan komponen dan token shadcn/ui. Komponen baru dibuat hanya jika belum ada yang sesuai.
- Setiap halaman data memiliki loading, empty, dan error state, serta responsif.
- Aksi destruktif membutuhkan konfirmasi yang menyebut objek yang terdampak. Gunakan `ConfirmDialog`, yang tetap terbuka dan tidak dapat ditutup selama permintaan berjalan.
- Toast hanya untuk umpan balik singkat dan muncul di kanan atas. Error yang perlu diperbaiki pengguna ditampilkan di dekat field atau form, bukan hanya di toast.
- Halaman pengaturan dibagi per bagian. Setiap bagian memiliki tombol simpan sendiri yang nonaktif selama belum ada perubahan.
- Form memiliki label, pesan error per field, dan tombol yang nonaktif saat submit.
- Data table memiliki pengurutan asc/desc pada kolom yang didukung API, filter jika datanya memungkinkan, dan dropdown jumlah data per halaman dengan pilihan 10, 20, 50, dan 100.
- Klik pada baris data table membuka halaman detail. Tautan di dalam baris tetap ada untuk keyboard, dan tombol aksi di baris tidak ikut memicu klik baris.
- Setiap resource yang dapat dibuat memiliki halaman form sendiri. Setelah berhasil dibuat, arahkan ke halaman detailnya.
- Halaman form dan detail memakai `CenteredPage`, sehingga berada di tengah dengan lebar yang sama.
- Form memakai `FormCard`: satu kolom, semua field sama lebar, aksi di kanan bawah dengan urutan Batal lalu Simpan.
- Relasi yang dapat diatur, seperti role pengguna, diisi di form yang sama dan disimpan dalam satu transaksi, bukan di halaman atau kartu terpisah.
- Semua fungsi dapat dipakai dengan keyboard.
- Teks UI dalam Bahasa Indonesia, spesifik: "Simpan pengguna", bukan "Submit".

## Testing

- Perubahan perilaku disertai test. Bug fix diawali test yang mereproduksi bug.
- Setiap endpoint diuji 2xx, 401, 403, dan 422, ditambah data scope dan privilege escalation jika relevan.
- Gunakan factory dan database MySQL khusus testing. Jangan memakai data production.
- Test harus gagal ketika perilakunya rusak.

Sebelum menyatakan selesai, jalankan yang relevan dan laporkan hasil apa adanya:

```bash
# backend/
vendor/bin/pint --test
vendor/bin/phpstan analyse
php artisan test

# frontend/
npm run lint
npm run type-check
npm run test
npm run build
```

Jika ada yang gagal atau tidak dapat dijalankan, katakan dengan jelas.

## Git

Gunakan Conventional Commits, contoh `feat(user): add user deactivation`. Commit atau push hanya jika diminta.

## Anti-Slop

Setiap baris harus punya alasan untuk ada. Hal-hal berikut dilarang.

**Kode**

- Komentar yang mengulang isi kode, banner pemisah, dan kode yang dimatikan dengan komentar. Komentar hanya menjelaskan alasan yang tidak terlihat dari kode.
- Stub, placeholder, `TODO` tanpa konteks, dan implementasi palsu yang tampak selesai.
- Abstraksi untuk satu pemakaian, interface dengan satu implementasi tanpa batas modul, dan wrapper satu baris.
- Opsi konfigurasi, parameter, atau feature flag tanpa kebutuhan saat ini.
- `try/catch` yang menelan error atau hanya mencatat lalu melanjutkan. Biarkan exception handler bekerja.
- Pengecekan untuk kondisi yang sudah dijamin oleh type, validasi, atau constraint.
- Nama generik seperti `Manager`, `Helper`, `Util`, `data`, `info`, `processData`.
- Method atau konfigurasi package yang tidak diverifikasi pada versi terpasang.
- Dependency baru jika framework atau package yang ada sudah cukup.
- Refactor, formatting, atau perbaikan di luar lingkup permintaan.
- Test yang hanya menguji mock atau perilaku framework.

**UI**

- Gradien dekoratif, glassmorphism, card di dalam card, bayangan berlebihan, dan animasi tanpa fungsi.
- Emoji sebagai ikon, hero section pada halaman aplikasi, serta data atau teks contoh yang tertinggal.
- Teks generik seperti "Selamat datang kembali!" atau "Terjadi kesalahan".
- Karakter tipografi khas teks AI di frontend: em dash, en dash, tanda kutip melengkung, karakter elipsis, titik tengah, dan panah karakter. Gunakan tanda baca ASCII, kata seperti "sampai", atau komponen ikon.

**Tulisan** (komentar, commit, PR, dokumen, laporan)

- Kata promosi seperti robust, seamless, powerful, komprehensif, canggih.
- Pembuka basa-basi, pengulangan isi, dan penutup yang hanya merangkum ulang.
- Klaim "sudah berhasil", "aman", atau "production-ready" tanpa bukti yang dijalankan.
