-- migrasi: registrasi warga + verifikasi pengurus
-- hanya warga yang sudah disetujui admin yang bisa mengirim kegiatan, pengaduan, umkm, dan foto
-- jalankan setelah 004_umkm_detail.sql: sql editor -> new query -> paste -> run

-- ---------- profil warga ----------
create table if not exists public.warga_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 3 and 80),
  phone text not null check (phone ~ '^[0-9+()\- ]{8,20}$'),
  house_id text references public.houses (id) on delete set null,
  blok_rumah text not null check (char_length(blok_rumah) between 1 and 20),
  relation text not null default 'pemilik' check (relation in ('pemilik', 'penyewa', 'keluarga')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users on delete set null
);
create index if not exists warga_profiles_status_idx on public.warga_profiles (status);

alter table public.warga_profiles enable row level security;

drop policy if exists "warga lihat profil sendiri" on public.warga_profiles;
drop policy if exists "admin kelola profil" on public.warga_profiles;
create policy "warga lihat profil sendiri" on public.warga_profiles for select to authenticated using (user_id = auth.uid());
create policy "admin kelola profil" on public.warga_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- warga terverifikasi = profil disetujui
create or replace function public.is_verified_warga()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.warga_profiles where user_id = auth.uid() and status = 'approved');
$$;

-- isi profil otomatis dari data form registrasi (metadata signup)
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
  -- akun admin dibuat dari dashboard tanpa metadata, dilewati
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
    coalesce(v_house, nullif(trim(v_meta ->> 'blok_rumah'), ''), '-'),
    case when v_meta ->> 'relation' in ('pemilik', 'penyewa', 'keluarga') then v_meta ->> 'relation' else 'pemilik' end
  )
  on conflict (user_id) do nothing;
  return new;
exception when others then
  -- data form tidak valid: akun tetap dibuat, warga melengkapi data lewat halaman akun
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_warga on auth.users;
create trigger on_auth_user_created_warga
  after insert on auth.users
  for each row execute function public.handle_new_warga();

-- ajukan / ajukan ulang data registrasi (akun lama tanpa profil atau yang ditolak)
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
  values (auth.uid(), trim(p_full_name), trim(p_phone), p_house_id, p_house_id, p_relation, 'pending')
  on conflict (user_id) do update
    set full_name = excluded.full_name, phone = excluded.phone, house_id = excluded.house_id,
        blok_rumah = excluded.blok_rumah, relation = excluded.relation,
        status = 'pending', admin_note = null, reviewed_at = null, reviewed_by = null;
end;
$$;

-- daftar warga untuk admin (termasuk email dari auth.users)
create or replace function public.admin_list_warga()
returns table (
  user_id uuid, email text, email_confirmed boolean, full_name text, phone text, house_id text, blok_rumah text,
  relation text, status text, admin_note text, created_at timestamptz, reviewed_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'khusus admin';
  end if;
  return query
    select p.user_id, u.email::text, u.email_confirmed_at is not null, p.full_name, p.phone, p.house_id, p.blok_rumah,
           p.relation, p.status, p.admin_note, p.created_at, p.reviewed_at
      from public.warga_profiles p
      join auth.users u on u.id = p.user_id
     order by (p.status = 'pending') desc, p.created_at desc;
end;
$$;

create or replace function public.review_warga(p_user_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'khusus admin';
  end if;
  if p_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'status tidak valid';
  end if;
  update public.warga_profiles
     set status = p_status, admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()
   where user_id = p_user_id;
  if not found then
    raise exception 'profil tidak ditemukan';
  end if;
end;
$$;

revoke all on function public.submit_registration(text, text, text, text) from public, anon;
revoke all on function public.admin_list_warga() from public, anon;
revoke all on function public.review_warga(uuid, text, text) from public, anon;
grant execute on function public.submit_registration(text, text, text, text) to authenticated;
grant execute on function public.admin_list_warga() to authenticated;
grant execute on function public.review_warga(uuid, text, text) to authenticated;

-- ---------- perketat aksi warga: wajib terverifikasi ----------
do $$
declare t text;
begin
  foreach t in array array['kegiatan', 'umkm', 'pengaduan'] loop
    execute format('drop policy if exists "warga kirim draft" on public.%I', t);
    execute format('drop policy if exists "warga ubah milik sendiri" on public.%I', t);
    execute format('drop policy if exists "warga hapus milik sendiri" on public.%I', t);
  end loop;

  foreach t in array array['kegiatan', 'umkm'] loop
    execute format('create policy "warga kirim draft" on public.%I for insert to authenticated with check (status = ''draft'' and user_id = auth.uid() and public.is_verified_warga())', t);
    execute format('create policy "warga ubah milik sendiri" on public.%I for update to authenticated using (user_id = auth.uid() and public.is_verified_warga()) with check (user_id = auth.uid() and status = ''draft'')', t);
    execute format('create policy "warga hapus milik sendiri" on public.%I for delete to authenticated using (user_id = auth.uid() and public.is_verified_warga())', t);
  end loop;
end $$;

create policy "warga kirim draft" on public.pengaduan for insert to authenticated
  with check (status = 'draft' and progress = 'diterima' and response is null and user_id = auth.uid() and public.is_verified_warga());
create policy "warga ubah milik sendiri" on public.pengaduan for update to authenticated
  using (user_id = auth.uid() and status <> 'published' and public.is_verified_warga())
  with check (user_id = auth.uid() and status = 'draft' and progress = 'diterima');
create policy "warga hapus milik sendiri" on public.pengaduan for delete to authenticated
  using (user_id = auth.uid() and status <> 'published' and public.is_verified_warga());

drop policy if exists "warga unggah foto" on storage.objects;
create policy "warga unggah foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text and (public.is_verified_warga() or public.is_admin()));

-- status buka/libur umkm juga hanya untuk warga terverifikasi
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
     and ((user_id = auth.uid() and public.is_verified_warga()) or public.is_admin());
  if not found then
    raise exception 'tidak punya akses ke usaha ini';
  end if;
end;
$$;
