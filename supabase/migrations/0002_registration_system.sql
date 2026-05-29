-- Registration system - info capture (name + email), 1 account per computer.
-- Project: xxfkdfedxvbsrqajdhkv
--
-- Each registration records the device_id (Windows MachineGuid from the Tauri
-- shell). A device may hold at most ONE registration, enforced server-side, so
-- a user cannot create multiple accounts on the same computer (even after a
-- reinstall, since the MachineGuid is stable). Email is globally unique.
--
-- Same security model as the activation tables: RLS denies all direct access;
-- the SECURITY DEFINER functions are the only entry points.

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------
create table if not exists public.registrations (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null,
  device_id   text not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists registrations_email_key  on public.registrations (lower(email));
create        index if not exists registrations_device_idx on public.registrations (device_id);

alter table public.registrations enable row level security;

-- ----------------------------------------------------------------------------
-- Function: has this device already registered?
-- ----------------------------------------------------------------------------
create or replace function public.check_registration(p_device_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.registrations%rowtype;
begin
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    return json_build_object('registered', false);
  end if;

  select * into r from public.registrations where device_id = p_device_id limit 1;
  if not found then
    return json_build_object('registered', false);
  end if;

  return json_build_object('registered', true, 'full_name', r.full_name, 'email', r.email);
end;
$$;

-- ----------------------------------------------------------------------------
-- Function: register a new account (enforces 1-per-device + unique email)
-- ----------------------------------------------------------------------------
create or replace function public.register(p_full_name text, p_email text, p_device_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_full_name is null or length(trim(p_full_name)) = 0
     or p_email is null or length(trim(p_email)) = 0
     or p_device_id is null or length(trim(p_device_id)) = 0 then
    return json_build_object('ok', false, 'reason', 'bad_input');
  end if;

  if position('@' in p_email) = 0 then
    return json_build_object('ok', false, 'reason', 'bad_email');
  end if;

  -- One account per computer.
  select count(*) into v_count from public.registrations where device_id = p_device_id;
  if v_count >= 1 then
    return json_build_object('ok', false, 'reason', 'device_limit');
  end if;

  -- Globally unique email.
  if exists (select 1 from public.registrations where lower(email) = lower(trim(p_email))) then
    return json_build_object('ok', false, 'reason', 'email_taken');
  end if;

  insert into public.registrations(full_name, email, device_id)
  values (trim(p_full_name), lower(trim(p_email)), p_device_id);

  return json_build_object('ok', true);
exception when unique_violation then
  return json_build_object('ok', false, 'reason', 'email_taken');
end;
$$;

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------
revoke all on function public.check_registration(text)          from public;
revoke all on function public.register(text, text, text)        from public;
grant execute on function public.check_registration(text)         to anon, authenticated;
grant execute on function public.register(text, text, text)       to anon, authenticated;

-- Make the new functions visible to PostgREST immediately.
notify pgrst, 'reload schema';
