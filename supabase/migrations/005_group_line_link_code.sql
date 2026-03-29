-- ========================================
-- himajiku: LINE連携コード機能
-- ========================================

-- グループにLINE連携コードカラムを追加
alter table groups add column link_code text unique;
alter table groups add column link_code_expires_at timestamptz;

-- line_bot_groupsテーブルは不要になったため削除
drop table if exists line_bot_groups;
