-- migrasi: kiriman warga wajib login (magic link email)
-- jalankan setelah schema.sql: sql editor -> new query -> paste -> run

do $$
declare t text;
begin
  foreach t in array array['kegiatan', 'umkm', 'pengaduan'] loop
    execute format('alter table public.%I drop column if exists submitter_token', t);
    execute format('alter table public.%I add column if not exists user_id uuid default auth.uid() references auth.users on delete set null', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
    execute format('drop policy if exists "warga kirim draft" on public.%I', t);
  end loop;
end $$;

-- kegiatan & umkm: warga kirim draft, lihat/ubah/hapus milik sendiri, edit = kembali ke draft
do $$
declare t text;
begin
  foreach t in array array['kegiatan', 'umkm'] loop
    execute format('create policy "warga kirim draft" on public.%I for insert to authenticated with check (status = ''draft'' and user_id = auth.uid())', t);
    execute format('create policy "warga lihat milik sendiri" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "warga ubah milik sendiri" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and status = ''draft'')', t);
    execute format('create policy "warga hapus milik sendiri" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- pengaduan: hanya bisa diubah/dihapus selama belum tayang
create policy "warga kirim draft" on public.pengaduan for insert to authenticated
  with check (status = 'draft' and progress = 'diterima' and response is null and user_id = auth.uid());
create policy "warga lihat milik sendiri" on public.pengaduan for select to authenticated
  using (user_id = auth.uid());
create policy "warga ubah milik sendiri" on public.pengaduan for update to authenticated
  using (user_id = auth.uid() and status <> 'published')
  with check (user_id = auth.uid() and status = 'draft' and progress = 'diterima');
create policy "warga hapus milik sendiri" on public.pengaduan for delete to authenticated
  using (user_id = auth.uid() and status <> 'published');

-- foto: hanya user login, ke folder miliknya sendiri ({user_id}/nama-file)
drop policy if exists "warga unggah foto" on storage.objects;
create policy "warga unggah foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
