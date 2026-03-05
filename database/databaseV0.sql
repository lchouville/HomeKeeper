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

create policy "Insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Update own profile"
on public.profiles
for update
using (auth.uid() = id);
