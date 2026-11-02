-- Satu suara per akun warga terverifikasi; ini bukan pemungutan suara rahasia formal.
create table public.usulan_warga (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 title text not null check (char_length(trim(title)) between 3 and 150),
 content text not null check (char_length(trim(content)) between 10 and 3000),
 status text not null default 'draft' check (status in ('draft','published','rejected')),
 created_at timestamptz not null default now()
);
alter table public.usulan_warga enable row level security;
create policy "warga kirim usulan" on public.usulan_warga for insert to authenticated with check (user_id = auth.uid() and status = 'draft' and public.is_verified_warga());
create policy "admin kelola usulan" on public.usulan_warga for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.usulan_warga to authenticated;
create function public.daftar_usulan() returns table(id uuid, title text, content text, status text, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = public as $$
 select u.id, u.title, u.content, u.status, u.created_at, coalesce(u.user_id = auth.uid(), false) from public.usulan_warga u
 where u.status = 'published' or u.user_id = auth.uid() order by u.created_at desc, u.id desc limit 200;
$$;
revoke all on function public.daftar_usulan() from public;
grant execute on function public.daftar_usulan() to anon, authenticated;

create table public.jajak_pendapat (
 id uuid primary key default gen_random_uuid(), title text not null check (char_length(trim(title)) between 3 and 150),
 description text not null default '' check (char_length(description) <= 3000),
 options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 10),
 closes_at timestamptz not null, published boolean not null default false, created_at timestamptz not null default now()
);
alter table public.jajak_pendapat enable row level security;
create policy "publik baca jajak" on public.jajak_pendapat for select to anon, authenticated using (published or public.is_admin());
create policy "admin kelola jajak" on public.jajak_pendapat for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.jajak_pendapat to anon, authenticated;
grant insert, update on public.jajak_pendapat to authenticated;
create table public.suara_jajak (
 poll_id uuid not null references public.jajak_pendapat(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 option_index integer not null check (option_index >= 0), created_at timestamptz not null default now(),
 primary key(poll_id, user_id)
);
alter table public.suara_jajak enable row level security;
revoke all on public.suara_jajak from public, anon, authenticated;

create function public.jaga_pilihan_jajak() returns trigger language plpgsql security definer set search_path = public as $$
begin
 if exists (select 1 from public.suara_jajak where poll_id = old.id) and (new.options is distinct from old.options or new.title is distinct from old.title) then raise exception 'Pertanyaan dan pilihan tidak dapat diubah setelah ada suara'; end if;
 return new;
end $$;
create trigger jaga_pilihan_jajak before update on public.jajak_pendapat for each row execute function public.jaga_pilihan_jajak();
create function public.kirim_suara(p_poll_id uuid, p_option integer) returns void language plpgsql security definer set search_path = public as $$
declare p public.jajak_pendapat%rowtype;
begin
 if not public.is_verified_warga() then raise exception 'Hanya warga terverifikasi dapat memberikan suara'; end if;
 select * into p from public.jajak_pendapat where id = p_poll_id for update;
 if not found or not p.published or p.closes_at <= now() then raise exception 'Jajak pendapat tidak tersedia atau sudah ditutup'; end if;
 if p_option is null or p_option < 0 or p_option >= jsonb_array_length(p.options) then raise exception 'Pilihan tidak valid'; end if;
 insert into public.suara_jajak(poll_id,user_id,option_index) values(p_poll_id,auth.uid(),p_option);
exception when unique_violation then raise exception 'Anda sudah memberikan suara';
end $$;
create function public.hasil_jajak(p_poll_id uuid) returns table(option_index integer, total bigint, mine boolean)
language sql stable security definer set search_path = public as $$
 select x.i::integer, count(v.user_id), coalesce(bool_or(v.user_id = auth.uid()), false)
 from public.jajak_pendapat p cross join lateral generate_series(0, jsonb_array_length(p.options)-1) x(i)
 left join public.suara_jajak v on v.poll_id = p.id and v.option_index = x.i
 where p.id = p_poll_id and (p.published or public.is_admin()) group by x.i order by x.i;
$$;
revoke all on function public.kirim_suara(uuid,integer), public.hasil_jajak(uuid) from public;
grant execute on function public.kirim_suara(uuid,integer) to authenticated;
grant execute on function public.hasil_jajak(uuid) to anon, authenticated;
