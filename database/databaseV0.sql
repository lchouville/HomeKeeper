create type role_type as enum ('user', 'admin');

create table public.profiles (
    id uuid primary key unique references auth.users(id) on delete cascade,
    pseudo varchar(50) not null unique,
    email text not null unique,
    role role_type not null default 'user',
    created_at timestamptz not null default now()
);

create or replace function set_email_from_auth_users()
returns trigger as $$
declare
  user_email text;
begin
  select email into user_email
  from auth.users
  where id = NEW.id;

  if user_email is null then
    raise exception 'Utilisateur introuvable dans auth.users';
  end if;

  NEW.email := user_email;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_set_email
before insert on public.profiles
for each row
execute function set_email_from_auth_users();

alter table public.profiles enable row level security;


create policy "public read" on profiles
for select
using (true);

create policy "Admin can insert any profile"
on public.profiles
for insert
with check (auth.role() = 'admin');

create policy "Update own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Admin can update any profile"
on public.profiles
for update
using (auth.role() = 'admin');

create policy "Delete own profile"
on public.profiles
for delete
using (auth.uid() = id);

create policy "Admin can delete any profile"
on public.profiles
for delete
using (auth.role() = 'admin');


-- Households table

create table households (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  created_at timestamptz default now()
);

create table household_members (
  household_id uuid references households(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (household_id, profile_id)
);

alter table household_members enable row level security;

create policy "Household members can read their household"
on household_members
for select
using (profile_id = auth.uid());

create policy "Household members can insert into their household"
on household_members
for insert
with check (profile_id = auth.uid());

create policy "Household members can update their household"
on household_members
for update
using (profile_id = auth.uid());

create policy "Household members can delete from their household"
on household_members
for delete
using (profile_id = auth.uid());

