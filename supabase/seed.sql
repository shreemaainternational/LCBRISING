-- Seed data for development
insert into public.clubs (name, district, city, state)
values ('Lions Club of Baroda Rising Star', '323-E', 'Vadodara', 'Gujarat')
on conflict do nothing;
