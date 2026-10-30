create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null check (length(p256dh) <= 512),
  auth_key text not null check (length(auth_key) <= 512),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "kelola perangkat sendiri" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table public.push_queue (
  id bigint generated always as identity primary key,
  notification_id uuid not null unique references public.notifikasi(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','done')),
  attempts integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon, authenticated;
create function public.queue_push_notification() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.push_queue(notification_id) values (new.id);
  return new;
end $$;
create trigger queue_push_notification after insert on public.notifikasi for each row execute function public.queue_push_notification();
revoke all on function public.queue_push_notification() from public, anon, authenticated;
create function public.claim_push_queue() returns setof public.push_queue language sql security definer set search_path = public as $$
  update public.push_queue q set status = 'processing', locked_at = now(), attempts = q.attempts + 1
  where q.id in (select id from public.push_queue where (status = 'pending' or (status = 'processing' and locked_at < now() - interval '10 minutes')) and attempts < 5 order by id for update skip locked limit 50)
  returning q.*;
$$;
revoke all on function public.claim_push_queue() from public, anon, authenticated;
grant execute on function public.claim_push_queue() to service_role;
