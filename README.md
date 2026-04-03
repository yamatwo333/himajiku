# himajiku (暇時空)

友達と「暇な日」を共有して、なんとなく集まれるモバイルWebアプリ。

## 機能

- LINEログイン
- カレンダーで暇な日をタップして登録
- 時間帯（午前/午後/夜/夜中）を複数選択可
- ひとことコメント
- 友達の暇も一覧表示
- 3人以上が暇な日はLINEグループに自動通知

## 通知仕様

- 通知は保存直前との差分で判定し、単日保存でも「まとめてシェア」でも、新しく条件を満たした日付・時間帯だけ送ります
- すでに通知済みの時間帯は、そのまま維持されているだけなら再通知しません
- いったん条件を外れたあとで再び条件を満たした時間帯は、再通知対象に戻ります

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
- E2E では日付を固定しており、`calendar` / `bulk` / `profile` の visual regression も `npm run test:e2e` に含まれます
- visual snapshot を更新する場合は `npm run test:e2e:update-snapshots` を実行し、意図した UI 変更だけが `tests/__screenshots__/` に出ていることを確認してください
- 変更前の安全確認は `npm run lint && npm run build && npm run test:e2e` の順がおすすめです
- CI では Linux 上で同じ visual regression を走らせるので、snapshot 更新後は GitHub Actions の結果まで確認すると安心です
- 手動で `npm run dev` を立てて E2E を流す場合は、同じ値を環境変数に設定してください

## CI

- GitHub Actions の `CI` workflow が `push` / `pull_request` ごとに `lint` `build` `test:e2e` を実行します
- CI が落ちたときは run の `Summary` から `Artifacts` にある `playwright-artifacts` を開くと、`playwright-report/` と `test-results/` の中身を確認できます
- artifact は `Run E2E smoke tests` が落ちたときだけ upload されるので、スクリーンショットや trace を見たいときは失敗 run を開いてください
- visual 差分が原因なら、まず artifact の diff を見てから `npm run test:e2e:update-snapshots` でローカル更新し、最後に GitHub Actions が green になるところまで確認すると運用しやすいです

## データベース

`supabase/migrations/001_initial_schema.sql` をSupabase SQL Editorで実行してください。
