-- Store one Push subscription for each admin device.
create table if not exists public.admin_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_push_subscriptions enable row level security;

drop policy if exists "Admins can manage their own push subscriptions" on public.admin_push_subscriptions;
create policy "Admins can manage their own push subscriptions"
  on public.admin_push_subscriptions for all to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

grant select, insert, update, delete on public.admin_push_subscriptions to authenticated;

-- Enable pg_net from Database > Extensions before running this file.
create or replace function public.notify_admin_booking_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  publishable_key text;
  webhook_secret text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'alep_supabase_url' limit 1;

  select decrypted_secret into publishable_key
  from vault.decrypted_secrets where name = 'alep_supabase_anon_key' limit 1;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'alep_booking_push_secret' limit 1;

  if project_url is null or publishable_key is null or webhook_secret is null then
    raise warning 'Admin push is not configured in Supabase Vault; reservation was saved without sending a push.';
    return new;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/notify-admin-booking',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', publishable_key,
      'x-booking-push-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'public',
      'table', 'reservations',
      'record', jsonb_build_object(
        'id', new.id,
        'client_name', new.client_name,
        'service_name', new.service_name,
        'appointment_date', new.appointment_date,
        'appointment_time', new.appointment_time
      )
    ),
    timeout_milliseconds := 3000
  );

  return new;
end;
$$;

revoke all on function public.notify_admin_booking_created() from public, anon, authenticated;

drop trigger if exists notify_admin_after_booking on public.reservations;
create trigger notify_admin_after_booking
  after insert on public.reservations
  for each row execute function public.notify_admin_booking_created();
