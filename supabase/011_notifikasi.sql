-- Jalankan setelah 010. Notifikasi hanya dapat dibaca pemilik akun.
create table public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  target text not null check (target in ('/warga/akun', '/warga/pengaduan', '/warga/kegiatan', '/warga/umkm')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifikasi_user_created_idx on public.notifikasi(user_id, created_at desc, id desc);
alter table public.notifikasi enable row level security;
create policy "baca notifikasi sendiri" on public.notifikasi for select to authenticated using (user_id = auth.uid());
create policy "baca tandai sendiri" on public.notifikasi for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notifikasi from anon, authenticated;
grant select on public.notifikasi to authenticated;
grant update (read_at) on public.notifikasi to authenticated;

create function public.buat_notifikasi_perubahan() returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_title text; v_message text; v_target text;
begin
  if not public.is_admin() then return new; end if;
  if tg_table_name = 'warga_profiles' then
    if new.status is not distinct from old.status then return new; end if;
    v_user := new.user_id; v_title := 'Status akun diperbarui';
    v_message := case new.status when 'approved' then 'Akun Anda telah disetujui pengurus.' when 'rejected' then 'Pendaftaran Anda belum disetujui. Periksa halaman akun.' when 'suspended' then 'Akun Anda dinonaktifkan sementara.' else 'Status akun Anda menunggu peninjauan.' end;
    v_target := '/warga/akun';
  elsif tg_table_name = 'pengaduan' then
    if new.status is not distinct from old.status and new.progress is not distinct from old.progress and new.response is not distinct from old.response then return new; end if;
    v_user := new.user_id; v_title := 'Pengaduan diperbarui'; v_message := 'Pengurus memperbarui status atau tanggapan pengaduan Anda.'; v_target := '/warga/pengaduan';
  else
    if new.status is not distinct from old.status or new.status not in ('published', 'rejected') then return new; end if;
    v_user := new.user_id; v_title := case when tg_table_name = 'kegiatan' then 'Kegiatan ditinjau' else 'UMKM ditinjau' end;
    v_message := case when new.status = 'published' then 'Kiriman Anda telah diterbitkan.' else 'Kiriman Anda ditolak. Periksa kiriman Anda.' end;
    v_target := case when tg_table_name = 'kegiatan' then '/warga/kegiatan' else '/warga/umkm' end;
  end if;
  if v_user is not null then insert into public.notifikasi(user_id, title, message, target) values (v_user, v_title, v_message, v_target); end if;
  return new;
end $$;
revoke all on function public.buat_notifikasi_perubahan() from public, anon, authenticated;
create trigger notifikasi_profil after update on public.warga_profiles for each row execute function public.buat_notifikasi_perubahan();
create trigger notifikasi_pengaduan after update on public.pengaduan for each row execute function public.buat_notifikasi_perubahan();
create trigger notifikasi_kegiatan after update on public.kegiatan for each row execute function public.buat_notifikasi_perubahan();
create trigger notifikasi_umkm after update on public.umkm for each row execute function public.buat_notifikasi_perubahan();
