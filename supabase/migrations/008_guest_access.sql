-- ========================================
-- sharehima: guest access
-- ========================================

create table guest_members (
  id uuid primary key default gen_random_uuid(),
  guest_token_hash text unique not null,
  group_id uuid not null references groups(id) on delete cascade,
  display_name text not null,
  claimed_user_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table guest_availability (
  id uuid primary key default gen_random_uuid(),
  guest_member_id uuid not null references guest_members(id) on delete cascade,
  date date not null,
  time_slots text[] not null default '{}',
  comment text default '' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (guest_member_id, date)
);

alter table guest_members enable row level security;
alter table guest_availability enable row level security;

create policy "guest_members: no direct access" on guest_members
  for all using (false) with check (false);

create policy "guest_availability: no direct access" on guest_availability
  for all using (false) with check (false);

create trigger guest_members_updated_at
  before update on guest_members
  for each row execute function update_updated_at();

create trigger guest_availability_updated_at
  before update on guest_availability
  for each row execute function update_updated_at();

create index idx_guest_members_group on guest_members(group_id);
create index idx_guest_members_claimed_user on guest_members(claimed_user_id);
create index idx_guest_members_token_hash on guest_members(guest_token_hash);
create index idx_guest_availability_date on guest_availability(date);
create index idx_guest_availability_member_date on guest_availability(guest_member_id, date);
