-- 0056_tighten_public_rls.sql
--
-- Close anonymous exposure on payment/internal tables. Every route that
-- reads or writes these tables uses the Supabase service role
-- (createAdminClient), which bypasses RLS — so removing the public/anon
-- policies below changes NO application behaviour, it only stops anyone
-- with the anon key from reading or inserting directly.
--
--   * payment_proofs.proofs_public_insert  — anon could insert fake
--     payment proofs against any invoice (with check (true)).
--   * invoices.invoices_public_read        — anon could read every
--     invoice by id/enumeration.
--   * qr_codes.qr_public_read              — anon could read UPI/QR
--     payment rows (no app code reads this table via anon).
--   * district_circulars.dc_club_read      — internal circulars were
--     world-readable (using (true)).
--   * newsletter_subscribers.news_public_insert — anon could spam-insert
--     subscribers directly (public signup goes through the service role).
--
-- After this, these tables have RLS enabled with admin/service-role
-- access only. Idempotent: safe to re-run.

drop policy if exists proofs_public_insert  on public.payment_proofs;
drop policy if exists invoices_public_read   on public.invoices;
drop policy if exists qr_public_read          on public.qr_codes;
drop policy if exists dc_club_read            on public.district_circulars;
drop policy if exists news_public_insert      on public.newsletter_subscribers;
