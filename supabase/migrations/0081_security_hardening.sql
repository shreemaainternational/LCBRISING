-- 0081_security_hardening.sql
-- Explicitly preserve deny-by-default behaviour on internal RLS tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'invoices','payment_proofs','qr_codes','payment_audit_logs','refunds',
    'portal_otp_codes','recurring_invoices','customer_preferences',
    'commission_records','committees','committee_members','trainings',
    'training_completions','awards','integrations','attendance','officers','test'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname='public' AND tablename=t
           AND policyname='deny_client_access'
       ) THEN
      EXECUTE format(
        'CREATE POLICY deny_client_access ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Enforce the underlying table's RLS for member birthday/anniversary views.
ALTER VIEW IF EXISTS public.upcoming_birthdays SET (security_invoker = true);
ALTER VIEW IF EXISTS public.upcoming_anniversaries SET (security_invoker = true);

-- Restrict administrative bootstrap and visitor-counter RPCs.
REVOKE ALL ON FUNCTION public.ensure_default_district() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_district() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.increment_visits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_visits() TO service_role;
REVOKE ALL ON FUNCTION public.current_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_member() TO authenticated, service_role;

-- Pin a deterministic search_path on public functions that lack one.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f'
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
      ))
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path TO pg_catalog, public',
                   f.nspname, f.proname, f.args);
  END LOOP;
END $$;
