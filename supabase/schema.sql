-- skema database warga padma
-- jalankan sekali di supabase: sql editor -> new query -> paste -> run

-- ---------- enum ----------
create type moderation_status as enum ('draft', 'published', 'rejected');
create type house_status as enum ('dihuni', 'disewakan', 'kosong');
create type akun_kas as enum ('warga', 'mushala');

-- ---------- admin ----------
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create policy "admin baca admins" on public.admins for select to authenticated using (public.is_admin());

-- ---------- rumah / denah ----------
create table public.houses (
  id text primary key,
  blok text not null,
  nomor int not null,
  owner text not null default 'Belum berpenghuni',
  phone text not null default '-',
  status house_status not null default 'kosong',
  penghuni int not null default 0,
  x int not null,
  y int not null,
  w int not null default 44,
  h int not null default 90
);

-- ---------- kegiatan ----------
create table public.kegiatan (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  location text not null,
  description text not null,
  image_url text,
  author text not null,
  blok_rumah text not null,
  status moderation_status not null default 'draft',
  submitter_token uuid,
  created_at timestamptz not null default now()
);

-- ---------- pengumuman ----------
create table public.pengumuman (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'Umum'
    check (category in ('Umum', 'Keamanan', 'Kebersihan', 'Keuangan', 'Ibadah')),
  priority text not null default 'normal' check (priority in ('normal', 'penting')),
  date date not null default current_date,
  author text not null,
  status moderation_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ---------- pengaduan ----------
create table public.pengaduan (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'Lainnya'
    check (category in ('Keamanan', 'Kebersihan', 'Fasilitas', 'Lingkungan', 'Lainnya')),
  reporter text not null,
  blok_rumah text not null,
  anonymous boolean not null default false,
  image_url text,
  status moderation_status not null default 'draft',
  progress text not null default 'diterima' check (progress in ('diterima', 'diproses', 'selesai')),
  response text,
  submitter_token uuid,
  created_at timestamptz not null default now()
);

-- ---------- umkm ----------
create table public.umkm (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text not null,
  category text not null default 'Lainnya'
    check (category in ('Makanan', 'Minuman', 'Jasa', 'Fashion', 'Kebutuhan Rumah', 'Lainnya')),
  description text not null,
  price text not null,
  image_url text,
  blok_rumah text not null,
  phone text not null,
  status moderation_status not null default 'draft',
  submitter_token uuid,
  created_at timestamptz not null default now()
);

-- ---------- pengurus & kontak ----------
create table public.pengurus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  phone text not null,
  blok_rumah text,
  periode text,
  urutan int not null default 0
);

create table public.kontak (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "group" text not null check ("group" in ('Pengurus RT', 'Keamanan', 'Darurat', 'Layanan')),
  phone text not null,
  note text
);

-- ---------- keuangan ----------
create table public.transaksi (
  id uuid primary key default gen_random_uuid(),
  akun akun_kas not null,
  type text not null check (type in ('masuk', 'keluar')),
  amount bigint not null check (amount >= 0),
  category text not null,
  note text not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.kebutuhan (
  id uuid primary key default gen_random_uuid(),
  akun akun_kas not null,
  title text not null,
  description text,
  target bigint not null check (target >= 0),
  terkumpul bigint not null default 0 check (terkumpul >= 0),
  deadline date not null,
  status text not null default 'berjalan' check (status in ('berjalan', 'terpenuhi'))
);

-- ---------- rls ----------
alter table public.houses enable row level security;
alter table public.kegiatan enable row level security;
alter table public.pengumuman enable row level security;
alter table public.pengaduan enable row level security;
alter table public.umkm enable row level security;
alter table public.pengurus enable row level security;
alter table public.kontak enable row level security;
alter table public.transaksi enable row level security;
alter table public.kebutuhan enable row level security;

-- data terbuka: semua orang baca, admin kelola
do $$
declare t text;
begin
  foreach t in array array['houses', 'pengurus', 'kontak', 'transaksi', 'kebutuhan'] loop
    execute format('create policy "publik baca" on public.%I for select using (true)', t);
    execute format('create policy "admin kelola" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- konten kiriman warga: publik hanya lihat yang tayang, kiriman baru wajib draft
do $$
declare t text;
begin
  foreach t in array array['kegiatan', 'umkm'] loop
    execute format('create policy "publik baca tayang" on public.%I for select using (status = ''published'' or public.is_admin())', t);
    execute format('create policy "warga kirim draft" on public.%I for insert to anon, authenticated with check (status = ''draft'')', t);
    execute format('create policy "admin kelola" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- pengumuman: hanya admin yang membuat
create policy "publik baca tayang" on public.pengumuman for select using (status = 'published' or public.is_admin());
create policy "admin kelola" on public.pengumuman for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- pengaduan: warga boleh kirim, tabel asli hanya dibaca admin (nama pelapor dirahasiakan lewat view)
create policy "warga kirim draft" on public.pengaduan for insert to anon, authenticated
  with check (status = 'draft' and progress = 'diterima' and response is null);
create policy "admin kelola" on public.pengaduan for all to authenticated using (public.is_admin()) with check (public.is_admin());

create view public.pengaduan_publik as
select
  id, title, content, category,
  case when anonymous then 'Anonim' else reporter end as reporter,
  blok_rumah, anonymous, image_url, progress, response, created_at
from public.pengaduan
where status = 'published';

grant select on public.pengaduan_publik to anon, authenticated;

-- ---------- storage foto ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "warga unggah foto" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'uploads');
create policy "admin kelola foto" on storage.objects for all to authenticated
  using (bucket_id = 'uploads' and public.is_admin())
  with check (bucket_id = 'uploads' and public.is_admin());

-- ---------- data awal ----------
-- 64 unit rumah (blok a-d, 16 unit per blok) sesuai posisi denah
insert into public.houses (id, blok, nomor, x, y)
select
  b.blok || '-' || n,
  b.blok,
  n,
  b.ox + ((n - 1) % 8) * 50,
  b.oy + ((n - 1) / 8) * 130
from (values ('A', 60, 70), ('B', 540, 70), ('C', 60, 390), ('D', 540, 390)) as b(blok, ox, oy)
cross join generate_series(1, 16) as n;

insert into public.kontak (name, "group", phone, note) values
  ('Polisi', 'Darurat', '110', null),
  ('Ambulans', 'Darurat', '118', null),
  ('Pemadam Kebakaran', 'Darurat', '113', null),
  ('PLN', 'Layanan', '123', null);
