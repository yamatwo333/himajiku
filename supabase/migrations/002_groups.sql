-- ========================================
-- himajiku: グループ機能
-- ========================================

-- グループ
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references profiles(id) on delete cascade,
  notify_threshold int not null default 3,
  line_group_id text,
  line_channel_access_token text,
  created_at timestamptz default now() not null
);

alter table groups enable row level security;

-- グループメンバー
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (group_id, user_id)
);

alter table group_members enable row level security;

-- RLS: グループはメンバーのみ閲覧可
create policy "groups: メンバーのみ閲覧" on groups
  for select using (
    id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "groups: 誰でも作成可" on groups
  for insert with check (auth.uid() = created_by);

create policy "groups: 作成者のみ更新" on groups
  for update using (auth.uid() = created_by);

create policy "groups: 作成者のみ削除" on groups
  for delete using (auth.uid() = created_by);

-- RLS: グループメンバー
create policy "group_members: メンバーのみ閲覧" on group_members
  for select using (
    group_id in (select group_id from group_members as gm where gm.user_id = auth.uid())
  );

create policy "group_members: 自分を追加可" on group_members
  for insert with check (auth.uid() = user_id);

create policy "group_members: 自分のみ削除可" on group_members
  for delete using (auth.uid() = user_id);

-- 招待コードでグループを検索するための関数（RLSをバイパス）
create or replace function find_group_by_invite_code(code text)
returns table (id uuid, name text) as $$
begin
  return query select g.id, g.name from groups g where g.invite_code = code;
end;
$$ language plpgsql security definer;

-- インデックス
create index idx_group_members_user on group_members(user_id);
create index idx_group_members_group on group_members(group_id);
create index idx_groups_invite_code on groups(invite_code);
