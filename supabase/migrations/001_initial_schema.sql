-- ========================================
-- himajiku: 初期スキーマ
-- ========================================

-- プロフィール（auth.usersと1:1）
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "profiles: 誰でも閲覧可" on profiles
  for select using (true);

create policy "profiles: 自分のみ更新" on profiles
  for update using (auth.uid() = id);

create policy "profiles: 自分のみ作成" on profiles
  for insert with check (auth.uid() = id);

-- 暇登録
create table availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  time_slots text[] not null default '{}',
  comment text default '' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, date)
);

alter table availability enable row level security;

-- 全員が全員の暇を見れる（同じサービスを使っている仲間前提）
create policy "availability: 誰でも閲覧可" on availability
  for select using (true);

create policy "availability: 自分のみ作成" on availability
  for insert with check (auth.uid() = user_id);

create policy "availability: 自分のみ更新" on availability
  for update using (auth.uid() = user_id);

create policy "availability: 自分のみ削除" on availability
  for delete using (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger availability_updated_at
  before update on availability
  for each row execute function update_updated_at();

-- 新規ユーザー登録時にプロフィールを自動作成
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'display_name', 'ユーザー'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- インデックス
create index idx_availability_date on availability(date);
create index idx_availability_user_date on availability(user_id, date);
