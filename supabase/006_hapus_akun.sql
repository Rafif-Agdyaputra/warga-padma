-- migrasi: admin menghapus akun warga
-- akun dihapus permanen dari auth.users -> tidak bisa login, email bisa dipakai daftar ulang
-- jalankan setelah 005_registrasi_warga.sql: sql editor -> new query -> paste -> run

create or replace function public.admin_delete_warga(p_user_id uuid, p_delete_content boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'khusus admin';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'tidak bisa menghapus akun sendiri';
  end if;
  if exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'akun admin tidak bisa dihapus dari sini';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'akun tidak ditemukan';
  end if;

  if p_delete_content then
    delete from public.kegiatan where user_id = p_user_id;
    delete from public.umkm where user_id = p_user_id;
    delete from public.pengaduan where user_id = p_user_id;
  end if;

  -- lepas kepemilikan file storage agar tidak menghalangi penghapusan user
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner') then
    execute 'update storage.objects set owner = null where owner = $1' using p_user_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id') then
    execute 'update storage.objects set owner_id = null where owner_id = $1' using p_user_id::text;
  end if;

  -- profil warga ikut terhapus (on delete cascade), kiriman yang tersisa jadi tanpa pemilik
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_warga(uuid, boolean) from public, anon;
grant execute on function public.admin_delete_warga(uuid, boolean) to authenticated;
