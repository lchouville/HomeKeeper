--###########--
--# Profils #--
--###########--
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

    -- CRUD
    create policy "Admin can insert any profile"
    on public.profiles
    for insert
    with check (auth.role() = 'admin');

    create policy "public read" on profiles
    for select
    using (true);

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

--####################--
--# Households tables #--
--####################--

    create table households (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null,
    created_at timestamptz default now()
    );

    alter table households enable row level security;

    create table household_members (
    household_id uuid references households(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (household_id, profile_id)
    );

    alter table household_members enable row level security;

    -- CRUD Houshold
    create policy "user can create a household"
    on households
    for insert
    with check (auth.role() = 'user' or auth.role() = 'admin');

    create policy "Household members can read their household"
    on households
    for select
    using (id in (select household_id from household_members where profile_id = auth.uid()));

    create policy "Household members can update their household"
    on households
    for update
    using (id in (select household_id from household_members where profile_id = auth.uid()));

    create policy "Household members can delete their household"
    on households
    for delete
    using (id in (select household_id from household_members where profile_id = auth.uid()));

    -- CRUD Houshold Members
    create policy "Household members can insert into their household"
    on household_members
    for insert
    with check (profile_id = auth.uid());

    create policy "Household members can read their household"
    on household_members
    for select
    using (profile_id = auth.uid());

    create policy "Household members can update their household"
    on household_members
    for update
    using (profile_id = auth.uid());

    create policy "Household members can delete from their household"
    on household_members
    for delete
    using (profile_id = auth.uid());

--################--
--# Stocks table #--
--################--

    create table stocks (
    household uuid references households(id) on delete cascade,
    product uuid references products(id)  on delete cascade,
    qty_needed float not null default 0,
    qty_available float not null default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    primary key (household,product)
    );

    alter table stocks enable row level security;

    -- CRUD
    create policy "Household members can insert stocks of their household"
    on stocks
    for insert
    with check (household in (select household_id from household_members where profile_id = auth.uid
    ()));

    create policy "Household members can read stocks of their household"
    on stocks
    for select
    using (household in (select household_id from household_members where profile_id = auth.uid()));

    create policy "Household members can update stocks of their household"
    on stocks
    for update
    using (household in (select household_id from household_members where profile_id = auth.uid()));

    create policy "Household members can delete stocks of their household"
    on stocks
    for delete
    using (household in (select household_id from household_members where profile_id = auth.uid()));

--############--
--# Products #--
--############--
    create table products (
        id uuid primary key default gen_random_uuid(),
        ean text unique,
        name text not null,
        qty integer default 0,
        unit text,
        created_at timestamptz default now()
    );

    alter table products enable row level security;

    -- CRUD
    create policy "user can create a product"
    on products
    for insert
    with check (auth.role() = 'user' or auth.role() = 'admin');

    create policy "user can read a product"
    on products
    for select
    using (auth.role() = 'user' or auth.role() = 'admin');

    create policy "user can delete a product"
    on products
    for delete
    using (auth.role() = 'user' or auth.role() = 'admin');

    create policy "user can update a product"
    on products
    for update
    with check (auth.role() = 'user' or auth.role() = 'admin');

