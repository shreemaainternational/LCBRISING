-- Seed data for development
insert into public.clubs (name, district, city, state, club_number)
values ('Lions Club of Baroda Rising Star', '3232 F1', 'Vadodara', 'Gujarat', '179323')
on conflict do nothing;
