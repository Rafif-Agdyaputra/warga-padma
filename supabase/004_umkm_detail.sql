-- migrasi: detail umkm (jam buka, status usaha, menu/daftar jasa, link toko & sosmed)
-- jalankan setelah 003_denah_editor.sql: sql editor -> new query -> paste -> run

alter table public.umkm add column if not exists open_time time;
alter table public.umkm add column if not exists close_time time;
alter table public.umkm add column if not exists business_status text not null default 'aktif';
alter table public.umkm add column if not exists status_note text;
-- daftar menu (makanan/minuman) atau daftar jasa: [{ "name": "...", "price": "...", "note": "..." }]
alter table public.umkm add column if not exists catalog jsonb not null default '[]'::jsonb;
-- { "instagram": "...", "tiktok": "...", "facebook": "...", "shopee": "...", "tokopedia": "..." }
alter table public.umkm add column if not exists links jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'umkm_business_status_check') then
    alter table public.umkm add constraint umkm_business_status_check check (business_status in ('aktif', 'libur', 'tidak_aktif'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'umkm_catalog_check') then
    alter table public.umkm add constraint umkm_catalog_check check (jsonb_typeof(catalog) = 'array' and jsonb_array_length(catalog) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'umkm_links_check') then
    alter table public.umkm add constraint umkm_links_check check (jsonb_typeof(links) = 'object');
  end if;
end $$;

-- pemilik boleh ganti status buka/libur/tidak aktif tanpa review ulang admin
create or replace function public.set_umkm_status(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('aktif', 'libur', 'tidak_aktif') then
    raise exception 'status tidak valid';
  end if;
  update public.umkm
     set business_status = p_status,
         status_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id
     and (user_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'tidak punya akses ke usaha ini';
  end if;
end;
$$;

revoke all on function public.set_umkm_status(uuid, text, text) from public, anon;
grant execute on function public.set_umkm_status(uuid, text, text) to authenticated;
