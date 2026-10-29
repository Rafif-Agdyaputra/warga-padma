-- migrasi: nomor rumah warga selalu mengikuti nomor yang tampil di denah
-- id rumah (mis. "C-11") adalah kode internal dan tidak berubah saat admin menomori ulang di editor denah,
-- jadi yang ditampilkan/disimpan sebagai blok_rumah adalah label blok + nomor (mis. "C-9")
-- jalankan setelah 006_hapus_akun.sql: sql editor -> new query -> paste -> run

create or replace function public.house_label(p_id text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(trim(label), ''), blok || '-' || nomor) from public.houses where id = p_id;
$$;

-- perbaiki data warga yang sudah terdaftar
update public.warga_profiles p
   set blok_rumah = public.house_label(p.house_id)
 where p.house_id is not null
   and blok_rumah is distinct from public.house_label(p.house_id);

-- label ikut berubah saat rumah dinomori ulang / diganti blok di editor denah
create or replace function public.sync_warga_house_label()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.warga_profiles
     set blok_rumah = coalesce(nullif(trim(new.label), ''), new.blok || '-' || new.nomor)
   where house_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_house_label_change on public.houses;
create trigger on_house_label_change
  after update of blok, nomor, label on public.houses
  for each row execute function public.sync_warga_house_label();

-- registrasi baru: simpan label, bukan id internal
create or replace function public.handle_new_warga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_house text := nullif(v_meta ->> 'house_id', '');
begin
  if coalesce(trim(v_meta ->> 'full_name'), '') = '' then
    return new;
  end if;
  if v_house is not null and not exists (select 1 from public.houses x where x.id = v_house) then
    v_house := null;
  end if;
  insert into public.warga_profiles (user_id, full_name, phone, house_id, blok_rumah, relation)
  values (
    new.id,
    trim(v_meta ->> 'full_name'),
    coalesce(nullif(trim(v_meta ->> 'phone'), ''), '-'),
    v_house,
    coalesce(public.house_label(v_house), nullif(trim(v_meta ->> 'blok_rumah'), ''), '-'),
    case when v_meta ->> 'relation' in ('pemilik', 'penyewa', 'keluarga') then v_meta ->> 'relation' else 'pemilik' end
  )
  on conflict (user_id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create or replace function public.submit_registration(p_full_name text, p_phone text, p_house_id text, p_relation text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
begin
  if auth.uid() is null then
    raise exception 'silakan masuk terlebih dahulu';
  end if;
  if not exists (select 1 from public.houses where id = p_house_id) then
    raise exception 'nomor rumah tidak ditemukan';
  end if;
  select status into cur from public.warga_profiles where user_id = auth.uid();
  if cur in ('approved', 'suspended') then
    raise exception 'data akun ini tidak bisa diajukan ulang, hubungi pengurus';
  end if;
  insert into public.warga_profiles (user_id, full_name, phone, house_id, blok_rumah, relation, status)
  values (auth.uid(), trim(p_full_name), trim(p_phone), p_house_id, public.house_label(p_house_id), p_relation, 'pending')
  on conflict (user_id) do update
    set full_name = excluded.full_name, phone = excluded.phone, house_id = excluded.house_id,
        blok_rumah = excluded.blok_rumah, relation = excluded.relation,
        status = 'pending', admin_note = null, reviewed_at = null, reviewed_by = null;
end;
$$;
