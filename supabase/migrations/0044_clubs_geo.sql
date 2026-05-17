-- =====================================================================
-- Geo-coordinates for clubs so we can plot the district on a map.
-- latitude / longitude are nullable — clubs without coords are listed
-- but not rendered as pins. address_full is the full mailing address
-- which we can geocode externally if needed.
-- =====================================================================

alter table public.clubs
  add column if not exists latitude  numeric(9, 6),
  add column if not exists longitude numeric(9, 6),
  add column if not exists address_full text,
  add column if not exists pin_color text;

-- Seed District 3232 FI clubs to sensible coords if any clubs already
-- exist without lat/lng — we put them in Vadodara so the map renders
-- something on a fresh install. Real coordinates can be entered via
-- the club edit screen or batch-imported.
update public.clubs
  set latitude = coalesce(latitude, 22.307159 + (random() - 0.5) * 0.08),
      longitude = coalesce(longitude, 73.181219 + (random() - 0.5) * 0.08)
  where deleted_at is null
    and latitude is null
    and longitude is null
    and (city ilike '%vadodara%' or city ilike '%baroda%' or city is null);
