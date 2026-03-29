-- ========================================
-- himajiku: LINE Bot連携グループ管理
-- ========================================

-- botが参加しているLINEグループを記録
create table line_bot_groups (
  id uuid primary key default gen_random_uuid(),
  line_group_id text unique not null,
  group_name text not null default 'LINEグループ',
  created_at timestamptz default now() not null
);

alter table line_bot_groups enable row level security;

-- 認証済みユーザーなら閲覧可（グループ設定で選択するため）
create policy "line_bot_groups: 認証済みユーザーは閲覧可" on line_bot_groups
  for select using (auth.uid() is not null);
