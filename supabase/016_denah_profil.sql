-- Hubungkan denah ke profil yang disetujui tanpa mengubah data manual rumah.
-- Izin tampilan denah terpisah dari izin berbagi dengan anggota serumah.
alter table public.warga_profiles add column share_denah boolean not null default false;
create function public.set_denah_sharing(p_share boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.warga_profiles set share_denah = p_share where user_id = auth.uid() and status = 'approved';
  if not found then raise exception 'Hanya warga terverifikasi dapat mengatur pilihan ini'; end if;
end $$;
create function public.denah_profil() returns table(house_id text, account_count bigint, owner_name text, owner_phone text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_verified_warga() or public.is_admin()) then raise exception 'Khusus warga terverifikasi'; end if;
  return query
    select p.house_id, count(*),
      (array_agg(p.full_name order by p.created_at, p.user_id) filter (where p.relation = 'pemilik' and p.share_denah))[1],
      (array_agg(p.phone order by p.created_at, p.user_id) filter (where p.relation = 'pemilik' and p.share_denah))[1]
    from public.warga_profiles p where p.status = 'approved' and p.house_id is not null group by p.house_id;
end $$;
revoke all on function public.set_denah_sharing(boolean), public.denah_profil() from public, anon;
grant execute on function public.set_denah_sharing(boolean), public.denah_profil() to authenticated;
