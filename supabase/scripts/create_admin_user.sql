-- =====================================================================
-- Create an admin user end-to-end:
--   1. auth.users row with bcrypt-hashed password (Supabase Auth)
--   2. auth.identities row so email-provider login works
--   3. public.members row with role='admin' + lions_role='international_admin'
--
-- Idempotent: re-running just refreshes the members-row metadata and the
-- password (so the same script can be used to reset the password).
--
-- DEFAULT CREDENTIALS:
--   email:    crm-admin@lcbrising.org
--   password: Lions3232F1@2026
-- Change the password immediately after first login in Supabase
-- Dashboard -> Authentication -> Users -> ... -> Reset password,
-- or sign in and use the profile page once that exists.
-- =====================================================================

-- pgcrypto is already enabled by 0001_initial_schema.sql / 0003.
-- These tables are managed by Supabase; we insert into them by hand.

do $$
declare
  v_email text := 'crm-admin@lcbrising.org';
  v_password text := 'Lions3232F1@2026';
  v_user_id uuid;
  v_existing_id uuid;
begin
  -- 1. Find or create the auth.users row.
  select id into v_existing_id from auth.users where email = v_email;

  if v_existing_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_super_admin,
      is_sso_user,
      is_anonymous,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('name', 'CRM Admin'),
      now(),
      now(),
      false, false, false,
      '', '', '', '', '', ''
    );
  else
    v_user_id := v_existing_id;
    -- Refresh password (this is what makes the script doubles as a reset).
    update auth.users
       set encrypted_password = crypt(v_password, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_user_id;
  end if;

  -- 2. Ensure auth.identities row for the email provider.
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
     set identity_data = excluded.identity_data,
         updated_at = now();

  -- 3. Upsert public.members row (federation admin).
  insert into public.members (
    user_id, name, email, role, lions_role, status, joined_at
  ) values (
    v_user_id, 'CRM Admin', v_email, 'admin', 'international_admin', 'active', current_date
  )
  on conflict (email) do update
     set user_id = excluded.user_id,
         role = 'admin',
         lions_role = 'international_admin',
         status = 'active',
         updated_at = now();

  raise notice 'admin user ready: email=% user_id=%', v_email, v_user_id;
end $$;

-- Verification
select id, email, email_confirmed_at is not null as confirmed
  from auth.users
 where email = 'crm-admin@lcbrising.org';

select id, email, role, lions_role, status
  from public.members
 where email = 'crm-admin@lcbrising.org';
