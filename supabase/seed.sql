-- Seed data for development
insert into public.clubs (name, district, city, state)
values ('Lions Club of Baroda Rising Star', '3232-F1', 'Vadodara', 'Gujarat')
on conflict do nothing;
