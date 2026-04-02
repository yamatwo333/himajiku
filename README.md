# himajiku (暇時空)

友達と「暇な日」を共有して、なんとなく集まれるモバイルWebアプリ。

## 機能

- LINEログイン
- カレンダーで暇な日をタップして登録
- 時間帯（午前/午後/夜/夜中）を複数選択可
- ひとことコメント
- 友達の暇も一覧表示
- 3人以上が暇な日はLINEグループに自動通知

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth)
- LINE Login OAuth 2.0
- LINE Messaging API
- Playwright

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に各キーを設定
npm run dev
```

## 環境変数

`.env.example` を参照してください。

## ブランド素材

- 元画像は `assets/brand-source/` に置いています
- 生成済みアセットを更新する場合は `npm run brand:build` を実行してください

## テスト

```bash
npx playwright install chromium
npm run test:e2e
```

- `playwright.config.ts` では E2E 実行時だけ `E2E_AUTH_BYPASS=1` を自動で付与しています
- 手動で `npm run dev` を立てて E2E を流す場合は、同じ値を環境変数に設定してください

## データベース

`supabase/migrations/001_initial_schema.sql` をSupabase SQL Editorで実行してください。
