-- Riwayat bersifat privat untuk pelapor dan admin. Jalankan setelah 009.
create table public.pengaduan_riwayat (
  id bigint generated always as identity primary key,
  pengaduan_id uuid not null references public.pengaduan(id) on delete cascade,
  status public.moderation_status not null,
  progress text not null check (progress in ('diterima', 'diproses', 'selesai')),
  response text,
  actor uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index pengaduan_riwayat_laporan_idx on public.pengaduan_riwayat (pengaduan_id, created_at desc, id desc);
alter table public.pengaduan_riwayat enable row level security;
create policy "pelapor dan admin baca riwayat" on public.pengaduan_riwayat for select to authenticated
using (public.is_admin() or exists (select 1 from public.pengaduan p where p.id = pengaduan_id and p.user_id = auth.uid()));
grant select on public.pengaduan_riwayat to authenticated;

create or replace function public.catatan_pengaduan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() and coalesce(auth.role(), '') <> 'service_role'
     and (new.progress is distinct from old.progress or new.response is distinct from old.response) then
    raise exception 'Hanya admin dapat mengubah progres dan tanggapan';
  end if;
  if tg_op = 'INSERT' then
    insert into public.pengaduan_riwayat(pengaduan_id, status, progress, response, actor)
    values (new.id, new.status, new.progress, new.response, auth.uid());
  elsif new.status is distinct from old.status or new.progress is distinct from old.progress or new.response is distinct from old.response then
    insert into public.pengaduan_riwayat(pengaduan_id, status, progress, response, actor)
    values (new.id, new.status, new.progress, new.response, auth.uid());
  end if;
  return new;
end $$;
create trigger catatan_pengaduan after insert or update on public.pengaduan
for each row execute function public.catatan_pengaduan();

-- Data lama mendapatkan snapshot terkini, bukan riwayat yang direka.
insert into public.pengaduan_riwayat(pengaduan_id, status, progress, response, created_at)
select id, status, progress, response, now() from public.pengaduan;
