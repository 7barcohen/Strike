begin;

-- Ensure RLS is active on all core marketplace tables.
alter table public.companies enable row level security;
alter table public.option_grants enable row level security;
alter table public.allocations enable row level security;

-- Ownership columns used by RLS checks.
alter table public.option_grants
  add column if not exists employee_user_id uuid references auth.users(id) on delete set null;

alter table public.allocations
  add column if not exists investor_user_id uuid references auth.users(id) on delete set null;

-- Timestamp columns referenced by the masked investor view.
alter table public.companies
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table public.option_grants
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table public.allocations
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Helper predicates for policy checks.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'platform_admin');
$$;

create or replace function public.is_accredited_investor()
returns boolean
language sql
stable
as $$
  select
    coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'accredited_investor', '')::boolean, false)
    or coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'accredited_investor', '')::boolean, false);
$$;

create or replace function public.mask_employee_alias(alias_value text)
returns text
language sql
immutable
as $$
  select
    case
      when alias_value is null or length(alias_value) = 0 then null
      when length(alias_value) = 1 then '*'
      else left(alias_value, 1) || repeat('*', greatest(length(alias_value) - 1, 2))
    end;
$$;

-- Live grants are always masked before publication.
create or replace function public.option_grants_mask_live_alias()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'live' then
    new.employee_alias := public.mask_employee_alias(new.employee_alias);
  end if;

  if new.employee_user_id is null and auth.uid() is not null then
    new.employee_user_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_option_grants_mask_live_alias on public.option_grants;
create trigger trg_option_grants_mask_live_alias
before insert or update on public.option_grants
for each row
execute function public.option_grants_mask_live_alias();

-- Privilege baseline.
revoke all on public.companies from anon;
revoke all on public.option_grants from anon;
revoke all on public.allocations from anon;

revoke all on public.companies from authenticated;
revoke all on public.option_grants from authenticated;
revoke all on public.allocations from authenticated;

grant select on public.companies to authenticated;
grant select, insert, update on public.option_grants to authenticated;
grant select, insert, update on public.allocations to authenticated;
grant all privileges on public.companies to service_role;
grant all privileges on public.option_grants to service_role;
grant all privileges on public.allocations to service_role;

-- Optional investor-facing masked projection.
create or replace view public.investor_live_option_grants
with (security_invoker = true)
as
select
  id,
  company_id,
  company_name,
  public.mask_employee_alias(employee_alias) as employee_alias,
  option_count,
  strike_price,
  exercise_cost,
  tax_route,
  status,
  created_at,
  updated_at
from public.option_grants
where status = 'live';

grant select on public.investor_live_option_grants to authenticated;

-- Clean slate for policy re-creation.
drop policy if exists companies_select_investors on public.companies;
drop policy if exists companies_admin_all on public.companies;
drop policy if exists companies_service_role_all on public.companies;

drop policy if exists option_grants_live_select_investors on public.option_grants;
drop policy if exists option_grants_employee_select_own on public.option_grants;
drop policy if exists option_grants_employee_insert_own on public.option_grants;
drop policy if exists option_grants_employee_update_own on public.option_grants;
drop policy if exists option_grants_admin_all on public.option_grants;
drop policy if exists option_grants_service_role_all on public.option_grants;

drop policy if exists allocations_investor_select_own on public.allocations;
drop policy if exists allocations_investor_insert_own on public.allocations;
drop policy if exists allocations_admin_all on public.allocations;
drop policy if exists allocations_service_role_all on public.allocations;

-- Companies: authenticated accredited investors can read; admins can do everything.
create policy companies_select_investors
on public.companies
for select
to authenticated
using (public.is_accredited_investor() or public.is_platform_admin());

create policy companies_admin_all
on public.companies
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy companies_service_role_all
on public.companies
for all
to service_role
using (true)
with check (true);

-- Option grants: investors can read only live deals; employees can manage only their own rows.
create policy option_grants_live_select_investors
on public.option_grants
for select
to authenticated
using (
  (status = 'live' and public.is_accredited_investor())
  or public.is_platform_admin()
);

create policy option_grants_employee_select_own
on public.option_grants
for select
to authenticated
using (employee_user_id = auth.uid());

create policy option_grants_employee_insert_own
on public.option_grants
for insert
to authenticated
with check (employee_user_id = auth.uid() and not public.is_platform_admin());

create policy option_grants_employee_update_own
on public.option_grants
for update
to authenticated
using (employee_user_id = auth.uid() and not public.is_platform_admin())
with check (employee_user_id = auth.uid() and not public.is_platform_admin());

create policy option_grants_admin_all
on public.option_grants
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy option_grants_service_role_all
on public.option_grants
for all
to service_role
using (true)
with check (true);

-- Allocations: accredited investors can manage only their own allocation tickets.
create policy allocations_investor_select_own
on public.allocations
for select
to authenticated
using (
  investor_user_id = auth.uid()
  and (public.is_accredited_investor() or public.is_platform_admin())
);

create policy allocations_investor_insert_own
on public.allocations
for insert
to authenticated
with check (
  investor_user_id = auth.uid()
  and (public.is_accredited_investor() or public.is_platform_admin())
);

create policy allocations_admin_all
on public.allocations
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy allocations_service_role_all
on public.allocations
for all
to service_role
using (true)
with check (true);

commit;
