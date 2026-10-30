-- Pengajuan pindah dan riwayat hubungan akun dengan rumah.
create table public.house_move_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  house_id text not null references public.houses(id),
  relation text not null check (relation in ('pemilik','penyewa','keluarga')),
  note text check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create unique index house_move_one_pending on public.house_move_requests(user_id) where status = 'pending';
create table public.house_membership_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  house_id text references public.houses(id) on delete set null,
  house_label text not null,
  relation text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index house_membership_one_open on public.house_membership_history(user_id) where ended_at is null;
alter table public.warga_profiles add column share_household boolean not null default false;
alter table public.house_move_requests enable row level security;
alter table public.house_membership_history enable row level security;
create policy "baca permintaan sendiri atau admin" on public.house_move_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "baca riwayat sendiri atau admin" on public.house_membership_history for select to authenticated using (user_id = auth.uid() or public.is_admin());
grant select on public.house_move_requests, public.house_membership_history to authenticated;

-- Riwayat mulai dari saat migrasi, bukan tanggal perpindahan historis.
insert into public.house_membership_history(user_id, house_id, house_label, relation)
select user_id, house_id, blok_rumah, relation from public.warga_profiles where status = 'approved' and house_id is not null;

create function public.track_house_membership() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.status = 'approved' and new.status = 'approved' and new.house_id is distinct from old.house_id then
    -- Koreksi langsung admin tidak meneruskan persetujuan lama ke rumah baru.
    new.status := 'pending'; new.reviewed_at := null; new.reviewed_by := null; new.share_household := false;
  end if;
  if tg_op = 'UPDATE' and (new.house_id is distinct from old.house_id or new.relation is distinct from old.relation or new.status is distinct from old.status) then
    update public.house_membership_history set ended_at = now() where user_id = new.user_id and ended_at is null;
  end if;
  if new.status = 'approved' and new.house_id is not null and (tg_op = 'INSERT' or old.house_id is distinct from new.house_id or old.relation is distinct from new.relation or old.status is distinct from new.status) then
    insert into public.house_membership_history(user_id, house_id, house_label, relation) values(new.user_id, new.house_id, new.blok_rumah, new.relation);
  end if;
  return new;
end $$;
create trigger track_house_membership before insert or update on public.warga_profiles for each row execute function public.track_house_membership();

create function public.request_house_move(p_house_id text, p_relation text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare p public.warga_profiles%rowtype;
begin
  select * into p from public.warga_profiles where user_id = auth.uid() for update;
  if p.status is distinct from 'approved' then raise exception 'Hanya warga terverifikasi dapat mengajukan pindah'; end if;
  if not exists(select 1 from public.houses where id = p_house_id) then raise exception 'Rumah tidak ditemukan'; end if;
  if p.house_id = p_house_id and p.relation = p_relation then raise exception 'Rumah dan hubungan tidak berubah'; end if;
  insert into public.house_move_requests(user_id, house_id, relation, note) values (auth.uid(), p_house_id, p_relation, nullif(trim(p_note), ''));
end $$;

create function public.review_house_move(p_id uuid, p_approve boolean, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare req public.house_move_requests%rowtype; p public.warga_profiles%rowtype;
begin
  if not public.is_admin() then raise exception 'Khusus admin'; end if;
  select * into req from public.house_move_requests where id = p_id for update;
  if not found or req.status <> 'pending' then raise exception 'Permintaan tidak ditemukan atau sudah ditinjau'; end if;
  select * into p from public.warga_profiles where user_id = req.user_id for update;
  if p_approve then
    if p.status is distinct from 'approved' then raise exception 'Akun warga tidak lagi terverifikasi'; end if;
    -- Dua langkah dalam transaksi agar riwayat lama ditutup dan rumah baru tercatat setelah disetujui.
    update public.warga_profiles set house_id = req.house_id, blok_rumah = public.house_label(req.house_id), relation = req.relation, share_household = false where user_id = req.user_id;
    update public.warga_profiles set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid() where user_id = req.user_id;
  end if;
  update public.house_move_requests set status = case when p_approve then 'approved' else 'rejected' end, review_note = nullif(trim(p_note), ''), reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
end $$;

create function public.set_household_sharing(p_share boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.warga_profiles set share_household = p_share where user_id = auth.uid() and status = 'approved';
  if not found then raise exception 'Hanya warga terverifikasi dapat mengatur pilihan ini'; end if;
end $$;
create function public.my_household() returns table(full_name text, relation text) language sql stable security definer set search_path = public as $$
  select other.full_name, other.relation from public.warga_profiles me join public.warga_profiles other on other.house_id = me.house_id
  where me.user_id = auth.uid() and me.status = 'approved' and other.status = 'approved' and other.user_id <> me.user_id and other.share_household = true
  order by other.full_name;
$$;
revoke all on function public.request_house_move(text,text,text), public.review_house_move(uuid,boolean,text), public.set_household_sharing(boolean), public.my_household() from public, anon;
grant execute on function public.request_house_move(text,text,text), public.review_house_move(uuid,boolean,text), public.set_household_sharing(boolean), public.my_household() to authenticated;
