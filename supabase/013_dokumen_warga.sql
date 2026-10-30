-- Dokumen yang diunggah di sini dapat diakses publik melalui tautan berkas.
create table public.dokumen_warga (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 150),
  description text not null default '',
  category text not null check (category in ('Peraturan', 'Jadwal', 'Formulir', 'Lainnya')),
  file_path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.dokumen_warga enable row level security;
create policy "publik baca dokumen" on public.dokumen_warga for select to anon, authenticated using (true);
create policy "admin kelola dokumen" on public.dokumen_warga for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.dokumen_warga to anon, authenticated;
grant insert, update, delete on public.dokumen_warga to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumen-warga', 'dokumen-warga', true, 10485760, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "admin unggah dokumen" on storage.objects for insert to authenticated with check (bucket_id = 'dokumen-warga' and public.is_admin());
create policy "admin baca objek dokumen" on storage.objects for select to authenticated using (bucket_id = 'dokumen-warga' and public.is_admin());
create policy "admin hapus dokumen" on storage.objects for delete to authenticated using (bucket_id = 'dokumen-warga' and public.is_admin());
