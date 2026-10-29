-- migrasi: data penghuni rumah (pemilik, telepon, jumlah penghuni) hanya untuk warga terverifikasi & admin
-- publik / belum login hanya mendapat data denah (nomor, posisi, status hunian) lewat view houses_public
-- jalankan setelah 007_label_rumah.sql: sql editor -> new query -> paste -> run

drop policy if exists "publik baca" on public.houses;
drop policy if exists "warga terverifikasi baca" on public.houses;
create policy "warga terverifikasi baca" on public.houses for select to authenticated
  using (public.is_verified_warga() or public.is_admin());

-- view tanpa kolom pribadi; berjalan dengan hak pemilik view sehingga bisa dibaca publik
create or replace view public.houses_public as
  select id, blok, nomor, label, status, x, y, w, h, rotation
    from public.houses;

grant select on public.houses_public to anon, authenticated;

-- house_label dipakai fungsi registrasi; jalankan dengan hak pemilik agar tidak terhalang rls
create or replace function public.house_label(p_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(label), ''), blok || '-' || nomor) from public.houses where id = p_id;
$$;
