-- Foto bukti disimpan di bucket privat. Jalankan setelah 008_privasi_denah.sql.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pengaduan-private', 'pengaduan-private', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- URL foto tidak pernah diterbitkan; lokasi anonim disembunyikan juga.
create or replace view public.pengaduan_publik as
select id, title, content, category,
  case when anonymous then 'Anonim' else reporter end as reporter,
  case when anonymous then 'Disembunyikan' else blok_rumah end as blok_rumah,
  anonymous, null::text as image_url, progress, response, created_at
from public.pengaduan where status = 'published';

-- Foto baru harus berupa path privat, bukan URL publik atau URL eksternal.
create or replace function public.check_pengaduan_photo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.image_url is not null and (tg_op = 'INSERT' or new.image_url is distinct from old.image_url) then
    if new.image_url !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]+\.jpg$' then
      raise exception 'foto pengaduan harus disimpan di bucket privat';
    end if;
    if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin()
       and split_part(new.image_url, '/', 1) <> auth.uid()::text then
      raise exception 'foto bukan milik pengguna';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists check_pengaduan_photo on public.pengaduan;
create trigger check_pengaduan_photo before insert or update of image_url on public.pengaduan
for each row execute function public.check_pengaduan_photo();

-- Pemeriksaan referensi memakai hak pemilik agar RLS tidak menyembunyikan referensi lain.
create or replace function public.pengaduan_photo_in_use(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pengaduan where image_url = p_path);
$$;
revoke all on function public.pengaduan_photo_in_use(text) from public, anon;
grant execute on function public.pengaduan_photo_in_use(text) to authenticated;

drop policy if exists "pengaduan foto upload" on storage.objects;
create policy "pengaduan foto upload" on storage.objects for insert to authenticated
with check (bucket_id = 'pengaduan-private' and (storage.foldername(name))[1] = auth.uid()::text and (public.is_verified_warga() or public.is_admin()));
drop policy if exists "pengaduan foto read" on storage.objects;
create policy "pengaduan foto read" on storage.objects for select to authenticated
using (bucket_id = 'pengaduan-private' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "pengaduan foto delete" on storage.objects;
create policy "pengaduan foto delete" on storage.objects for delete to authenticated
using (bucket_id = 'pengaduan-private' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()) and not public.pengaduan_photo_in_use(name));
