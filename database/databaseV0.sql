create type role_type as enum ('user', 'admin');

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    pseudo varchar(50) not null unique,
    role role_type not null default 'user',
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Select own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Update own profile"
on public.profiles
for update
using (auth.uid() = id);