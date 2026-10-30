# Warga Padma — Portal Warga (Next.js)

Slicing website warga Perumahan Padma. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## Jalankan

```bash
cp .env.example .env.local   # isi url & publishable key supabase
npm install
npm run dev                  # http://localhost:3000 -> redirect ke /warga
```

## Setup Supabase

1. SQL Editor: jalankan berurutan `supabase/schema.sql`, `supabase/002_warga_login.sql`, `supabase/003_denah_editor.sql`, `supabase/004_umkm_detail.sql`, `supabase/005_registrasi_warga.sql`, `supabase/006_hapus_akun.sql`, `supabase/007_label_rumah.sql`, `supabase/008_privasi_denah.sql`, `supabase/009_privasi_pengaduan.sql`.
2. Authentication → Users: buat user admin, lalu `insert into admins (user_id) values ('<uid>');`
3. Authentication → URL Configuration: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/auth/callback` (tambahkan domain produksi nanti).

Admin masuk di `/admin/login` dengan email + password.

Warga mendaftar di `/warga/daftar` (nama, HP, nomor rumah, status di rumah, password) → verifikasi email → disetujui admin di `/admin/warga`. Hanya warga terverifikasi yang bisa mengirim kegiatan, pengaduan, UMKM, dan foto (dijaga RLS). Pengaturan Supabase yang disarankan:

- Authentication → Sign In / Providers → Email: *Confirm email* aktif, *Minimum password length* 8.
- Authentication → URL Configuration → Redirect URLs: `http://localhost:3000/auth/callback` (+ domain produksi).
- Authentication → Rate Limits / SMTP: gunakan SMTP sendiri bila warga banyak (SMTP bawaan dibatasi).

## Struktur URL

| Warga (`/warga/...`) | Admin (`/admin/...`) |
|---|---|
| `/warga` dashboard | `/admin` dashboard |
| `/warga/denah` denah interaktif (klik rumah) | `/admin/moderasi` antrian semua draft |
| | `/admin/denah` editor denah (siteplan, geser/putar/ubah ukuran) |
| `/warga/kegiatan` unggah/edit/hapus (draft) | `/admin/kegiatan` |
| `/warga/pengumuman` | `/admin/pengumuman` |
| `/warga/pengurus` | `/admin/pengurus` |
| `/warga/pengaduan` + peringatan hoaks (draft) | `/admin/pengaduan` (progres & tanggapan) |
| `/warga/kontak` | `/admin/kontak` |
| `/warga/umkm` promosi + foto (draft) | `/admin/umkm` |
| `/warga/keuangan` saldo kas warga & mushala | `/admin/keuangan` pemasukan/pengeluaran |
| `/warga/transparansi` kebutuhan warga & mushala | `/admin/kebutuhan` |
| | `/admin/rumah` data penghuni rumah |
| `/warga/daftar`, `/warga/akun` registrasi & status akun | `/admin/warga` verifikasi pendaftar |
| `/warga/lupa-password`, `/warga/atur-password` | |

## Struktur kode

```
src/
  app/warga/*            halaman umum (layout: header, bottom-nav mobile)
  app/admin/(auth)/login halaman login (tanpa sidebar)
  app/admin/(panel)/*    halaman admin (layout: sidebar)
  components/ui          button, modal/bottom-sheet, field, badge, tabs, dll
  components/warga       shell, denah SVG, view tiap halaman
  components/admin       shell + CrudPage generik (tabel desktop / kartu mobile)
  lib/types.ts           model data
  lib/supabase/*         klien supabase (browser & server)
  lib/store.tsx          data & auth via supabase
  proxy.ts               refresh sesi + proteksi /admin
  app/auth/callback      tujuan link login email
```

## Catatan

- Hak akses dijaga oleh row level security di database (lihat file sql), bukan hanya di tampilan.
- `lib/seed.ts` tidak dipakai lagi (sisa data contoh versi awal).
- Tata letak denah diatur dari `/admin/denah`: rumah di tabel `houses` (x, y, w, h, rotation), elemen lain di `map_items`, kanvas & siteplan di `map_settings`.
- Warna: utama `#801818 → #AC145A`, sekunder `#53665C`, aksen `#ECA825` (token di `src/app/globals.css`).

## Privasi dan retensi pengaduan

Jalankan `supabase/009_privasi_pengaduan.sql` setelah migrasi 008, lalu deploy versi aplikasi yang mendukung bucket `pengaduan-private`. Sampai keduanya selesai, perlindungan baru belum aktif. Lakukan perubahan saat pengiriman pengaduan sementara dihentikan agar versi lama tidak mengunggah foto ke bucket publik.

- Foto bukti pengaduan baru hanya dapat diakses pelapor dan admin, termasuk setelah laporan tayang; publik tidak menerima URL foto. Admin tetap dapat melihat identitas dan lokasi untuk menindaklanjuti laporan.
- Pada laporan anonim yang tayang, nama dan lokasi disembunyikan. Judul, isi, dan tanggapan tetap publik dan bisa mengandung informasi pengenal; admin harus meninjaunya sebelum menyetujui. Anonimitas tidak menjamin identitas tidak dapat disimpulkan.
- Laporan dan foto yang masih direferensikan disimpan sampai laporan atau foto dihapus oleh pemilik yang berwenang atau admin. Tidak ada penghapusan otomatis berdasarkan umur. Jika admin menghapus akun tanpa menghapus konten, laporan dan foto tetap disimpan untuk penanganan; bila memilih hapus konten, foto privat yang tertinggal perlu dibersihkan oleh admin. Backup dan salinan lain mengikuti kebijakan penyimpanan backup yang ditetapkan pengelola.
- Aplikasi mencoba menghapus foto privat yang tidak lagi digunakan ketika laporan dihapus, foto diganti, atau penyimpanan laporan gagal. Periksa setidaknya bulanan objek yatim di Storage, terutama setelah penghapusan akun atau gangguan jaringan, dan hapus melalui Storage API atau dashboard setelah memastikan tidak ada laporan yang merujuk objek tersebut. Jangan hapus baris `storage.objects` langsung dengan SQL.

### Memindahkan foto pengaduan lama

Foto lama di bucket `uploads` tetap bisa diakses melalui URL publik yang sudah diketahui, walaupun view publik tidak lagi menampilkannya. Migrasi ini **tidak otomatis mencabut URL lama**. Sebelum menerapkan pada produksi, buat backup, hentikan sementara penulisan pengaduan, dan uji di lingkungan staging. Sediakan URL proyek dan service-role key sebagai variabel lingkungan di terminal yang aman; jangan masukkan key ke repositori atau `NEXT_PUBLIC_*`.

1. Jalankan `node scripts/migrate-pengaduan-photos.mjs` untuk audit, lalu `node scripts/migrate-pengaduan-photos.mjs --apply` untuk menyalin foto yang berasal dari bucket `uploads` proyek ini dan memperbarui referensi pengaduan. Catat objek lama yang dilaporkan. URL eksternal dan foto yang gagal perlu ditangani manual. Skrip tidak menghapus objek lama dan dapat dijalankan kembali.
2. Untuk setiap objek lama, periksa bahwa tidak ada konten lain atau proses lain yang menggunakannya, lalu hapus menggunakan Storage API/dashboard. Sampai dihapus, URL lama tetap publik; tautan yang pernah disalin atau cache/salinan pihak ketiga tidak dapat ditarik kembali oleh aplikasi.
3. Verifikasi akses sebagai admin, pelapor, warga lain, dan tanpa login; periksa juga laporan anonim dan proses penghapusan. Setelah migrasi dan pemeriksaan selesai, aktifkan kembali pengiriman.

## Riwayat pengaduan

Jalankan `supabase/010_riwayat_pengaduan.sql` setelah migrasi 009. Pelapor dapat membuka riwayat perubahan status, progres, dan tanggapan pada Laporan Saya. Riwayat bersifat privat bagi pelapor dan admin. Data lama dimulai dengan snapshot saat migrasi; perubahan sebelumnya tidak tersedia. Pembaruan terlihat saat riwayat dibuka kembali, tanpa notifikasi email atau push.

## Notifikasi dalam aplikasi

Jalankan `supabase/011_notifikasi.sql` setelah migrasi 010. Notifikasi dibuat untuk perubahan status akun, tindak lanjut pengaduan, serta persetujuan atau penolakan kegiatan dan UMKM oleh admin. Notifikasi hanya terlihat oleh pemilik akun; indikator diperbarui setiap menit dan setelah ditandai dibaca. Tidak ada email atau push. Notifikasi tersimpan sampai akun dihapus.

## Dokumen warga

Jalankan `supabase/013_dokumen_warga.sql` setelah migrasi sebelumnya. Admin dapat mengunggah PDF hingga 10 MB melalui `/admin/dokumen`; daftar tersedia di `/warga/dokumen`. Jalankan juga `supabase/014_dokumen_login.sql` untuk membatasi daftar dan berkas kepada pengguna yang sudah masuk. Setiap pengguna yang masuk dapat mengakses dokumen; hindari mengunggah data pribadi atau rahasia. Jika penghapusan berkas gagal, hapus objek yang tersisa melalui Storage.

## Manajemen penghuni dan rumah

Jalankan `supabase/015_manajemen_penghuni.sql` setelah migrasi sebelumnya. Warga terverifikasi dapat mengajukan perubahan rumah atau hubungan pada halaman akun; pengurus meninjau di `/admin/perpindahan`. Riwayat dimulai saat migrasi. Anggota rumah lain hanya melihat nama dan hubungan warga yang secara sukarela mengaktifkan berbagi profil. Data rumah pada denah dikelola terpisah dan tidak otomatis disinkronkan dengan profil. Perubahan rumah langsung oleh admin mengembalikan profil ke status menunggu verifikasi.

## Profil warga pada denah

Jalankan `supabase/016_denah_profil.sql` setelah 015. Untuk rumah yang memiliki akun terverifikasi, denah menampilkan jumlah akun terverifikasi dan nama serta telepon pemilik yang secara khusus menyetujui tampil di denah melalui halaman akun. Jika ada beberapa pemilik yang setuju, ditampilkan yang terdaftar paling awal. Jumlah akun bukan jumlah seluruh penghuni. Rumah tanpa akun terverifikasi tetap menampilkan data manual; status hunian tetap dikelola pengurus.

## PWA dan notifikasi push

Deploy melalui HTTPS dengan Node.js 22 atau lebih baru. Jalankan `supabase/017_web_push.sql` setelah 011 dan migrasi sebelumnya. PWA dapat dipasang melalui browser; di iPhone tambahkan ke layar utama, lalu buka aplikasi untuk mengaktifkan notifikasi pada halaman Akun.

Buat kunci VAPID sekali melalui `npx web-push generate-vapid-keys`. Simpan `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (misalnya `mailto:admin@example.com`), `SUPABASE_SERVICE_ROLE_KEY`, dan `PUSH_CRON_SECRET` di konfigurasi server deployment. Jangan masukkan kunci privat, service-role, atau cron secret ke kode atau variabel `NEXT_PUBLIC_`. Jadwalkan permintaan GET ke `/api/push/dispatch` dengan header `Authorization: Bearer <PUSH_CRON_SECRET>` secara berkala menggunakan scheduler yang mendukung header rahasia. Endpoint wajib dilindungi; jangan panggil dari browser. Atur frekuensi sesuai penyedia hosting.

Antrean dibuat hanya untuk notifikasi baru setelah migrasi. Pekerjaan gagal dicoba hingga lima kali; pantau antrean `push_queue` dan log server. Retry setelah kegagalan sebagian dapat menyebabkan notifikasi ganda. Notifikasi hanya berisi teks umum dan tautan ke portal. Pengguna dapat menonaktifkan push di halaman akun pada setiap perangkat. PWA ini tidak menyimpan data halaman secara offline.
