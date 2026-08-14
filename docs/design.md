# 設計書 — my-book-shelf-and-bazars

最終更新: 2026-08-14

`docs/requirements.md` を前提に、画面構成・データモデル(DB設計)・実装フェーズを定義する。

## 1. 画面構成

### 1.1 フェーズ1(オーナー用)

| 画面 | 内容 |
|---|---|
| **本棚ビュー(メイン)** | 横スクロールの平面本棚。背表紙が並ぶ。上部/サイドに検索・フィルタ・並び替え。住人がその時々の状態で棚上に表示される(読んでいる/昼寝/うろついている等) |
| **本の詳細パネル** | 背表紙をクリックすると開く。表紙画像・書誌情報・実測サイズ・タグ・所持数・読書ステータス変更・貸出操作・積読期間・感想コメント欄(投稿含む) |
| **本の登録** | バーコード/ISBNスキャン(カメラ)、またはISBN/書名の手入力検索。取得した書誌情報のプレビュー→重複チェック→保存。実測サイズ・タグの手動追記もここで |
| **貸出管理** | 貸出中の本の一覧、貸出先・貸出日・返却予定日、超過ハイライト、返却操作 |
| **タグ/ジャンル管理** | 自由入力タグの一覧・編集(既存タグの選択+新規追加) |

住人が本を部屋に持ち込んでいる間は、その本は本棚ビューから消えるのみで、フェーズ1では「部屋」画面は作らない(要件3.6のスコープ通り)。

### 1.2 フェーズ2(同僚用・招待制)

| 画面 | 内容 |
|---|---|
| **招待リンク受け取り→初回プロフィール設定** | 名前のみ入力。以後ブラウザに紐づく識別トークンで同一人物として扱う |
| **本棚ビュー(閲覧)** | オーナーと同じ棚を閲覧のみで表示。登録・編集・貸出操作ボタンは非表示 |
| **本の詳細パネル(閲覧+予約+コメント)** | 書誌情報・住人保有状態を閲覧、予約ボタン、感想コメントの閲覧・投稿(名前+本文) |

オーナー側には以下を追加する:

| 画面 | 内容 |
|---|---|
| **招待リンク発行** | 同僚ごとに招待リンクを発行・失効できる |
| **予約管理** | 同僚からの予約一覧(誰が・いつ・何を)。通知はなし、能動的に確認する運用 |

## 2. データモデル(DB設計)

PostgreSQL / Prisma想定。主要テーブルのみ(詳細なカラム型は実装時に確定)。

```
Book
- id
- isbn
- title, author, publisher, published_year
- page_count
- cover_image_url            // 外部APIのURLをそのまま保持
- measured_width_mm / height_mm / depth_mm   // 手動入力
- owned_count                // 所持数(重複登録の代わり)
- reading_status              // unread | reading | finished
- acquired_at                 // 登録日(積読タイマーの起点)
- created_at / updated_at

Tag
- id, name, source            // source: auto(API由来) | manual

BookTag (中間テーブル)
- book_id, tag_id

Loan(貸出)
- id, book_id
- borrower_name, loaned_at, due_at, returned_at
  // returned_at が null かつ due_at 超過 → 超過扱い(計算値でよい)

Comment(感想・コメント)
- id, book_id
- author_name, author_type    // owner | colleague
- body, created_at

InhabitantState(住人の状態。単一レコードで現在状態を保持)
- id (固定1レコード)
- activity                    // idle | reading | napping | carrying
- current_book_id (nullable)
- location                    // shelf | room
- state_started_at
- next_transition_at          // 次の行動切り替え予定時刻(経過時間から状態を導出する方式)

Reservation(予約)
- id, book_id
- reserved_by_name, reserved_by_colleague_id (nullable)
- reserved_at, status          // active | fulfilled | cancelled

Colleague(フェーズ2・招待制の同僚)
- id, display_name, invite_token, created_at, revoked_at (nullable)
```

補足:
- 「住人保有状態」は `InhabitantState.current_book_id` と `Book` の関係、および `location` から導出する(本テーブル側に冗長フラグを持たせず、住人側を正とする)
- 貸出(Loan)と住人の持ち出し(InhabitantState)は別テーブルだが、「本棚から消える」という見た目上の扱いは共通ロジックで判定する(貸出中 or 住人が room に持ち出し中 → 棚に表示しない)

## 3. 実装フェーズ

### フェーズ1a: 基盤
- プロジェクトセットアップ(Next.js / PostgreSQL / Prisma)
- 本の登録(ISBN手入力検索・API連携、手動入力)、重複チェック
- シンプルな一覧表示(本棚ビューの前段階、まずはリスト/グリッドで可)

### フェーズ1b: 管理機能
- 検索・フィルタ・並び替え
- 読書ステータス管理、貸出管理(貸出/返却、超過表示)
- タグ/ジャンル管理、感想コメント欄

### フェーズ1c: 仮想本棚ビュー
- 背表紙の自動生成(タイトル・著者・厚み推定)
- 質感素材(Blenderで焼き込んだライティング画像)との合成
- 積読の可視化(古さに応じた見た目変化)

### フェーズ1d: 住人機能
- 自律行動シミュレーション(状態遷移・経過時間ベースの行動決定)
- 棚からの出し入れ(貸出/持ち出し中は非表示)
- タップでの書誌情報表示

### フェーズ2a: 同僚アクセス基盤
- 招待リンク発行・失効
- 初回プロフィール設定(名前のみ)、識別トークン
- 同僚向け閲覧専用ビュー(編集系UIの非表示)

### フェーズ2b: 予約・共有コメント
- 予約機能(同僚→本)、予約管理画面(オーナー)
- コメント欄の同僚投稿対応

### フェーズ3(将来検討・要件定義書7章)
- 住人の部屋への入り口探索
- 統計グラフ、複数住人 等
