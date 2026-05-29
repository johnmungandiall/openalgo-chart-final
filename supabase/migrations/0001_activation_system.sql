-- Activation system schema — Approach A: RPC functions + locked-down RLS
-- Project: xxfkdfedxvbsrqajdhkv
--
-- Model: 14-day free trial per device, then a paid key.
-- Binding: one key = one device (locked to the first machine that activates).
-- Validation: client calls the RPCs on every launch (online required).
-- Issuance: keys are minted manually (INSERT into public.licenses).
--
-- Security: RLS is enabled with NO policies, so the anon/authenticated roles
-- cannot touch these tables directly. The two functions are SECURITY DEFINER
-- (run as the owner = postgres, which bypasses RLS as the table owner), so the
-- client can ONLY reach the data through these controlled entry points.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table if not exists public.licenses (
  id            uuid primary key default gen_random_uuid(),
  license_key   text unique not null,
  email         text,
  status        text not null default 'active' check (status in ('active', 'revoked')),
  valid_days    integer,            -- null = perpetual; else expires_at = activated_at + valid_days
  device_id     text,               -- bound device fingerprint (null until first activation)
  activated_at  timestamptz,        -- when the key was first bound to a device
  expires_at    timestamptz,        -- computed on activation from valid_days
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.trials (
  device_id   text primary key,
  started_at  timestamptz not null default now(),
  trial_days  integer not null default 14
);

-- ----------------------------------------------------------------------------
-- Row-Level Security: deny ALL direct client access (no policies = no access)
-- ----------------------------------------------------------------------------
alter table public.licenses enable row level security;
alter table public.trials   enable row level security;

-- ----------------------------------------------------------------------------
-- Function: start the trial on first sight of a device, or report its status
-- ----------------------------------------------------------------------------
create or replace function public.check_or_start_trial(p_device_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started timestamptz;
  v_days    integer;
  v_expires timestamptz;
begin
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    return json_build_object('state', 'error', 'reason', 'no_device');
  end if;

  select started_at, trial_days into v_started, v_days
  from trials where device_id = p_device_id;

  if not found then
    insert into trials(device_id) values (p_device_id)
    returning started_at, trial_days into v_started, v_days;
  end if;

  v_expires := v_started + make_interval(days => v_days);

  return json_build_object(
    'state', 'trial',
    'started_at', v_started,
    'expires_at', v_expires,
    'days_remaining', greatest(0, ceil(extract(epoch from (v_expires - now())) / 86400.0)),
    'expired', (now() >= v_expires)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Function: activate a key (bind to device) or validate an already-bound key
-- ----------------------------------------------------------------------------
create or replace function public.activate_or_validate(p_key text, p_device_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lic public.licenses%rowtype;
begin
  if p_key is null or length(trim(p_key)) = 0 or p_device_id is null or length(trim(p_device_id)) = 0 then
    return json_build_object('valid', false, 'reason', 'bad_input');
  end if;

  select * into v_lic from public.licenses where license_key = trim(p_key);

  if not found then
    return json_build_object('valid', false, 'reason', 'not_found');
  end if;

  if v_lic.status = 'revoked' then
    return json_build_object('valid', false, 'reason', 'revoked');
  end if;

  -- First activation: bind the key to this device and compute expiry.
  if v_lic.device_id is null then
    update public.licenses
      set device_id   = p_device_id,
          activated_at = now(),
          expires_at   = case when valid_days is not null
                              then now() + make_interval(days => valid_days)
                              else null end
      where id = v_lic.id
      returning * into v_lic;
  elsif v_lic.device_id <> p_device_id then
    return json_build_object('valid', false, 'reason', 'bound_other_device');
  end if;

  -- Expiry check (null expires_at = perpetual).
  if v_lic.expires_at is not null and now() >= v_lic.expires_at then
    return json_build_object('valid', false, 'reason', 'expired', 'expires_at', v_lic.expires_at);
  end if;

  return json_build_object(
    'valid', true,
    'email', v_lic.email,
    'expires_at', v_lic.expires_at,
    'activated_at', v_lic.activated_at
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Permissions: client roles may ONLY execute the two entry-point functions
-- ----------------------------------------------------------------------------
revoke all on function public.check_or_start_trial(text)        from public;
revoke all on function public.activate_or_validate(text, text)  from public;
grant execute on function public.check_or_start_trial(text)       to anon, authenticated;
grant execute on function public.activate_or_validate(text, text) to anon, authenticated;
