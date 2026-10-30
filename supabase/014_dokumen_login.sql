-- Batasi daftar dan isi dokumen untuk pengguna yang telah login.
drop policy if exists "publik baca dokumen" on public.dokumen_warga;
create policy "pengguna login baca dokumen" on public.dokumen_warga for select to authenticated using (true);
revoke select on public.dokumen_warga from anon;
update storage.buckets set public = false where id = 'dokumen-warga';
create policy "pengguna login baca berkas dokumen" on storage.objects for select to authenticated
using (bucket_id = 'dokumen-warga' and exists (select 1 from public.dokumen_warga d where d.file_path = name));
