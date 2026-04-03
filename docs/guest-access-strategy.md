# Guest Access Strategy

## Decision Summary

- `未ログイン` でも、招待リンク経由で `1グループまで` 参加できる。
- `未ログイン` でも、その1グループ内では `閲覧` `単日入力` `まとめてシェア` ができる。
- `LINE通知` は `グループ単位` の機能とし、`管理者1人のLINEログイン/連携` で有効化する。
- `自分向けLINE通知` `複数グループ利用` `端末をまたいだ予定保持` `管理機能` はログイン後に解放する。
- `グループ作成` と `グループ管理` はログイン必須に寄せる。

この方針の狙いは、最初の利用ハードルを下げつつ、継続利用のタイミングで自然に LINE ログインへ誘導すること。

## User States

### Guest

- ブラウザ単位で識別される未ログイン利用者
- 招待リンクからのみ参加可能
- 参加可能グループ数は `1`

### Logged-in Member

- LINE ログイン済みユーザー
- 複数グループ参加可能
- 個人向け機能利用可能

### Group Admin

- LINE ログイン済みかつグループ作成者
- グループ設定変更、LINE 連携有効化が可能

## Capability Matrix

| 機能 | Guest | Logged-in Member | Group Admin |
| --- | --- | --- | --- |
| 招待リンクからグループ参加 | Yes | Yes | Yes |
| 2グループ目に参加 | No | Yes | Yes |
| グループのカレンダー閲覧 | Yes | Yes | Yes |
| 単日で予定入力 | Yes | Yes | Yes |
| まとめてシェア | Yes | Yes | Yes |
| 自分向けLINE通知 | No | Yes | Yes |
| 端末をまたいだ予定保持 | No | Yes | Yes |
| 参加グループ一覧 | No | Yes | Yes |
| グループ作成 | No | Yes | Yes |
| グループ設定変更 | No | No | Yes |
| グループLINE通知の有効化 | No | No | Yes |

## Product Rules

### 1. Guest can use only one group

- Guest が最初に参加したグループを `guest home group` とする。
- 同じグループへの再訪は自由。
- 別グループへの参加を試した時点でログイン導線を出す。
- 既存グループから退出しない限り、別グループへは進めない。

### 2. Group-level LINE notification

- グループ全体の LINE 通知は、そのグループの `管理者1人` が LINE 連携すれば有効。
- 一般メンバーや guest は、グループ通知の恩恵を受けられる。
- ただし `自分向け通知` はログイン済みユーザーのみ。

### 3. Guest data is browser-scoped

- Guest の予定や所属はそのブラウザにだけ紐づく。
- ブラウザ削除、端末変更、シークレットモード終了では失われうる。
- ログインすると、同じブラウザの guest データを引き継げるようにする。

## UX Spec

### A. Invite join flow

#### Guest, first group

- `招待コード入力/招待リンク開封`
- 参加前に `表示名` を入力
- `guest home group` を作成
- そのままカレンダーへ遷移

#### Guest, same group revisit

- 既存 guest として扱い、そのままカレンダーへ

#### Guest, second group attempt

- 参加はブロック
- ログイン導線モーダルを表示

Recommended modal copy:

- Title: `複数グループを使うにはLINEログイン`
- Body: `未ログインでは1グループまでお試しできます。LINEでログインすると、複数グループ参加、自分向け通知、予定の引き継ぎが使えます。`
- Primary CTA: `LINEでログインする`
- Secondary CTA: `今のグループに戻る`

### B. Guest calendar screen

- 1グループ内の閲覧、単日入力、まとめてシェアは許可
- ヘッダーかフッターに軽い訴求を出す

Recommended banner copy:

- `LINEでログインすると、別グループでも使えて、予定も引き継げます`

### C. Personal notification upsell

- 未ログイン状態では、自分向け通知トグルや導線でログインを促す

Recommended copy:

- `自分向けのLINE通知を受け取るにはログインが必要です`

### D. Cross-device sync upsell

- 端末変更や別ブラウザ利用が想像しやすい場所で訴求

Recommended copy:

- `LINEでログインすると、機種変更後も予定を引き継げます`

## Screen / Route Policy

### Public / Guest-allowed

- `/join`
- `/calendar?group=...`
- `/calendar/[date]?group=...`
- `/calendar/bulk?group=...`

条件:

- Logged-in user でその group の member
- または guest でその group の `guest home group` に所属

### Login-required

- `/groups`
- `/groups/[id]`
- `/profile`

### Group creation

- 当面はログイン必須
- 理由:
  - 管理者概念が明確
  - LINE 連携責任者を明確にできる
  - 実装がかなり簡単

## API Policy

### `POST /api/groups/join`

新仕様:

- Logged-in user:
  - 現行どおり参加
- Guest:
  - まだ group を持たない場合は参加可
  - 同じ group なら再参加扱い
  - 別 group の場合は `409` で `LOGIN_REQUIRED_FOR_MULTIPLE_GROUPS`

返却例:

```json
{
  "error": "複数グループを使うにはログインが必要です",
  "code": "LOGIN_REQUIRED_FOR_MULTIPLE_GROUPS"
}
```

### `GET /api/availability/month`

- logged-in member と guest member の両方を読めるようにする
- group ごとの参加者一覧は `profiles + guest_members` の union で返す

### `POST /api/availability`

- logged-in user:
  - 現行どおり `availability`
- guest:
  - `guest_availability` に保存

### `POST /api/availability/bulk`

- logged-in user:
  - 現行どおり `availability`
- guest:
  - `guest_availability` に保存
  - 通知判定は guest も含める

### Group admin APIs

以下はログイン済み管理者のみ:

- `POST /api/groups`
- `PUT /api/groups/[id]/settings`
- `POST /api/groups/[id]/line-link`
- `DELETE /api/groups/[id]/line-link`
- `POST /api/groups/[id]/transfer`
- `DELETE /api/groups/[id]`

## Data Model Recommendation

`profiles` に guest を無理に載せず、guest 用テーブルを分けるのが安全。

### Recommended new tables

#### `guest_members`

- `id uuid primary key`
- `guest_token_hash text unique not null`
- `group_id uuid not null references groups(id) on delete cascade`
- `display_name text not null`
- `claimed_user_id uuid null references profiles(id) on delete set null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

意図:

- 1 guest = 1 group を DB レベルで表現しやすい
- 後でログインした時の移行先も持てる

#### `guest_availability`

- `id uuid primary key`
- `guest_member_id uuid not null references guest_members(id) on delete cascade`
- `date date not null`
- `time_slots text[] not null default '{}'`
- `comment text default '' not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `unique (guest_member_id, date)`

### Cookie / client storage

- Cookie name: `sharehima_guest_token`
- 値はランダムな十分長い token
- サーバー保存は raw token ではなく `hash`

### Why not localStorage only

- 他メンバーから guest の予定が見えなくなる
- サーバー通知判定に guest の予定を含められない
- 端末内だけの見せかけデータになってしまう

## Merge / Claim Flow

guest が後から LINE ログインした場合:

1. 同一ブラウザの `sharehima_guest_token` を見る
2. `guest_members` が見つかれば、その group の membership を user 側へ作成
3. `guest_availability` を `availability` へ移行
4. `claimed_user_id` を設定
5. guest record は即削除せず `claimed` 状態にして一定期間保持してもよい

Conflict policy:

- すでに同じ user がその group に参加していたら、availability をマージ
- 同日の重複は user 側優先か、guest 側を確認させる
- 最初は `user 側優先 + guest 側コメントを破棄しない簡易マージ` でもよい

## Implementation Recommendation

### Phase 1: safest path

- group creation はログイン必須のまま
- guest join / guest availability / 1-group limit だけ追加
- `/groups` `/profile` は完全にログイン専用

利点:

- 実装コストが低い
- プロダクトの入口だけ軽くできる
- 管理系の権限設計を崩さない

### Phase 2

- guest -> logged-in claim flow
- 自分向け通知
- 参加グループ一覧へのアップセル改善

## Concrete File Impact

現状コードで主に触る想定の場所:

- `src/proxy.ts`
  - guest cookie を見て public routes を許可
- `src/lib/supabase/route.ts`
  - `getRouteActor()` 的な helper を追加
- `src/app/api/groups/join/route.ts`
  - guest join と 1-group limit 判定
- `src/app/api/availability/route.ts`
  - guest save 対応
- `src/app/api/availability/bulk/route.ts`
  - guest bulk save 対応
- `src/app/api/availability/month/route.ts`
  - guest member を含めて返す
- `src/app/join/page.tsx`
  - 2グループ目制限時のモーダル
- `src/components/calendar/CalendarPageClient.tsx`
  - guest upsell バナー
- `src/components/calendar/DayDetailClient.tsx`
  - guest 向けログイン導線

## Success Metrics

最低限見るべきもの:

- 招待リンク -> 予定入力完了率
- 未ログイン join 成功率
- guest から login への転換率
- guest の 2グループ目到達率
- LINE 通知有効化率
- 1グループあたりの回答人数
- guest 参加者を含めた通知発火率

## Open Questions

- Guest の表示名を group 単位で自由入力にするか
- Guest が group から退出できるか
- Guest の予定を group 参加者一覧でどう表示するか
- guest -> logged-in マージ時の重複コメントをどう扱うか

## Recommended Final Product Rule

- `未ログインでも1グループまではすぐ使える`
- `2グループ目からLINEログイン`
- `グループ通知は管理者1人の連携でON`
- `自分向け通知・履歴保持・複数グループ管理はログイン後に解放`
