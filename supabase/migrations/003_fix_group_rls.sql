-- ========================================
-- RLSポリシーの修正
-- グループ作成者が即座に閲覧可能にする
-- ========================================

-- 既存ポリシーを安全に削除（存在しない場合もエラーにならない）
do $$
begin
  -- groups
  drop policy if exists "groups: メンバーのみ閲覧" on groups;
  drop policy if exists "groups: 誰でも作成可" on groups;
  drop policy if exists "groups: 作成者のみ更新" on groups;
  drop policy if exists "groups: 作成者のみ削除" on groups;
  drop policy if exists "groups: ログインユーザーが作成可" on groups;
  drop policy if exists "groups: 作成直後に自分で閲覧可" on groups;

  -- group_members
  drop policy if exists "group_members: メンバーのみ閲覧" on group_members;
  drop policy if exists "group_members: 自分を追加可" on group_members;
  drop policy if exists "group_members: 自分のみ削除可" on group_members;
end$$;

-- groups: 作成者またはメンバーが閲覧可
create policy "groups: 閲覧可" on groups
  for select using (
    auth.uid() = created_by
    or id in (select group_id from group_members where user_id = auth.uid())
  );

-- groups: ログインユーザーが作成可
create policy "groups: 作成可" on groups
  for insert with check (auth.uid() is not null and auth.uid() = created_by);

-- groups: 作成者のみ更新可
create policy "groups: 更新可" on groups
  for update using (auth.uid() = created_by);

-- groups: 作成者のみ削除可
create policy "groups: 削除可" on groups
  for delete using (auth.uid() = created_by);

-- group_members: 同じグループのメンバーが閲覧可
create policy "group_members: 閲覧可" on group_members
  for select using (
    group_id in (select gm.group_id from group_members gm where gm.user_id = auth.uid())
  );

-- group_members: 自分を追加可
create policy "group_members: 追加可" on group_members
  for insert with check (auth.uid() = user_id);

-- group_members: 自分のみ削除可
create policy "group_members: 削除可" on group_members
  for delete using (auth.uid() = user_id);
