-- migrasi: editor denah (siteplan, elemen peta, rotasi rumah)
-- jalankan setelah 002_warga_login.sql: sql editor -> new query -> paste -> run

alter table public.houses add column if not exists rotation int not null default 0;
alter table public.houses add column if not exists label text;

-- baris kedua tiap blok menghadap ke bawah (jalan di bawahnya)
update public.houses set rotation = 180 where (nomor - 1) / 8 = 1 and rotation = 0;

-- ---------- pengaturan kanvas ----------
create table if not exists public.map_settings (
  id int primary key default 1 check (id = 1),
  width int not null default 1000 check (width between 200 and 6000),
  height int not null default 790 check (height between 200 and 6000),
  background_url text,
  background_opacity real not null default 0.5 check (background_opacity between 0 and 1),
  show_background boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.map_settings (id) values (1) on conflict do nothing;

-- ---------- elemen peta selain rumah ----------
create table if not exists public.map_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('jalan', 'hijau', 'fasilitas', 'label')),
  label text,
  sublabel text,
  tone text not null default 'netral' check (tone in ('netral', 'aksen', 'hijau')),
  x int not null,
  y int not null,
  w int not null check (w > 0),
  h int not null check (h > 0),
  rotation int not null default 0,
  z int not null default 0
);

alter table public.map_settings enable row level security;
alter table public.map_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['map_settings', 'map_items'] loop
    execute format('drop policy if exists "publik baca" on public.%I', t);
    execute format('drop policy if exists "admin kelola" on public.%I', t);
    execute format('create policy "publik baca" on public.%I for select using (true)', t);
    execute format('create policy "admin kelola" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- isi awal = layout denah bawaan (hanya jika masih kosong)
insert into public.map_items (kind, label, sublabel, tone, x, y, w, h, z)
select * from (values
  ('jalan', 'JL. PADMA UTAMA', null, 'netral', 20, 16, 960, 40, 0),
  ('jalan', 'JL. TERATAI', null, 'netral', 20, 310, 960, 66, 0),
  ('jalan', 'JL. MELATI', null, 'netral', 20, 628, 960, 44, 0),
  ('jalan', null, null, 'netral', 468, 16, 58, 656, 0),
  ('hijau', null, null, 'hijau', 60, 164, 394, 32, 1),
  ('hijau', null, null, 'hijau', 540, 164, 394, 32, 1),
  ('hijau', null, null, 'hijau', 60, 484, 394, 32, 1),
  ('hijau', null, null, 'hijau', 540, 484, 394, 32, 1),
  ('label', 'BLOK A', null, 'netral', 220, 162, 74, 24, 2),
  ('label', 'BLOK B', null, 'netral', 700, 162, 74, 24, 2),
  ('label', 'BLOK C', null, 'netral', 220, 482, 74, 24, 2),
  ('label', 'BLOK D', null, 'netral', 700, 482, 74, 24, 2),
  ('fasilitas', 'POS SATPAM', 'Gerbang Utama', 'netral', 60, 692, 150, 76, 1),
  ('fasilitas', 'TAMAN PADMA', 'Area bermain', 'hijau', 226, 692, 228, 76, 1),
  ('fasilitas', 'MUSHALA AL-PADMA', 'Ibadah & kajian', 'aksen', 540, 692, 210, 76, 1),
  ('fasilitas', 'BALAI WARGA', 'Pertemuan', 'netral', 766, 692, 168, 76, 1)
) as v(kind, label, sublabel, tone, x, y, w, h, z)
where not exists (select 1 from public.map_items);
