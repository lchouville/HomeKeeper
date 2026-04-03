--############--
--# Products #--
--############--
    create table products (
        product uuid primary key default gen_random_uuid(),
        ean text unique,
        name text unique not null,
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

-- Migrate products in stocks
    -- Create product column
    alter table stocks
    add column product uuid;
    -- Create existing product in product table
    insert into products (id, name)
    select gen_random_uuid(), product_name
    from stocks
    group by product_name;
    -- Link the new product with stocks
    update stocks s
    set product = p.id
    from products p
    where p.name = s.product_name;
    -- Drop actual PK
    alter table stocks drop constraint stocks_pkey;
    -- Delete Old Column
    alter table stocks
    drop column product_name,
    drop column unit;
    -- Make No Nullable Product
    alter table stocks
    alter column product set not null; 
    -- Create the new PK
    alter table stocks
    add primary key (household, product);
    -- Create the new FK
    alter table stocks
    add constraint stocks_product_fkey
    foreign key (product)
    references products(id)
    on delete cascade;