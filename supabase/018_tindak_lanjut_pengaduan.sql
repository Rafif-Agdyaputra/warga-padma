-- Penugasan internal pengurus; tidak tampil pada data publik atau pelapor.
create table public.pengaduan_tindak_lanjut (
  pengaduan_id uuid primary key references public.pengaduan(id) on delete cascade,
  penanggung_jawab text not null default '' check (char_length(penanggung_jawab) <= 100),
  catatan_internal text not null default '' check (char_length(catatan_internal) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.pengaduan_tindak_lanjut enable row level security;
create policy "admin kelola tindak lanjut" on public.pengaduan_tindak_lanjut for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.pengaduan_tindak_lanjut from anon, authenticated;
grant select, insert, update, delete on public.pengaduan_tindak_lanjut to authenticated;
