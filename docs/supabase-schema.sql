-- Run in Supabase SQL Editor. The table is deliberately inaccessible to public API roles.
create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  kind text not null check (kind in ('text','file')),
  body text,
  file_name text,
  storage_path text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists drops_expires_idx on public.drops(expires_at);
alter table public.drops enable row level security;
revoke all on public.drops from anon, authenticated;
insert into storage.buckets (id,name,public,file_size_limit)
values ('vraxis-drops','vraxis-drops',false,10485760)
on conflict (id) do update set public=false, file_size_limit=10485760;

-- Called only by Edge Function service-role client.
create or replace function public.claim_drop(p_hash text)
returns setof public.drops
language plpgsql security definer set search_path = public
as $$
begin
  return query
  delete from public.drops d
  where d.code_hash = p_hash and d.expires_at > now()
  returning d.*;
end;
$$;
revoke all on function public.claim_drop(text) from public, anon, authenticated;
grant execute on function public.claim_drop(text) to service_role;
