# CODEX 引き継ぎ仕様書 — X画像リンクカード生成ツール

> **このドキュメントは、別のAIエージェント (Codex) がこのプロジェクトの開発を引き継ぐための仕様書です。**
> プロジェクトの現状、完了済みの作業、各ファイルの役割、運用上の注意点を記載しています。

---

## 1. プロジェクト概要

X (旧Twitter) に投稿したときに OGP / Twitter Card メタタグを使って **大きな画像付きリンクカード** を表示させ、カードをタップしたユーザーを **指定URLへリダイレクト** する「中継URL」を生成・管理するツールです。

### 技術スタック
| 技術 | バージョン / 備考 |
|---|---|
| Next.js | 16.2.9 (App Router) |
| TypeScript | ^5 |
| Tailwind CSS | v4 (postcss経由) |
| Supabase | DB + Storage (cloud hosted) |
| Electron | ^42.4.0 (devDependencies に追加済み) |
| Lucide React | ^1.17.0 (アイコンライブラリ) |
| 管理画面認証 | Basic 認証 (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) |

### リポジトリの場所
```
c:\Users\sanpa\Dev\antiproduct\post-tool
```

---

## 2. 現在のファイル構成と各ファイルの役割

```
post-tool/
├── .env.example                    # 環境変数テンプレート
├── package.json                    # main: "electron.js", scripts.desktop: "electron ." 設定済み
├── electron.js                     # Electronメインプロセス (Next.js dev server 自動起動 + /admin 表示)
├── supabase/
│   └── migrations.sql              # DBスキーマ (cards, click_logs, RLS, index)
├── src/
│   ├── types/
│   │   └── index.ts                # Card, ClickLog, CardWithClickCount 型定義
│   ├── lib/
│   │   ├── supabase.ts             # クライアント用Supabaseクライアント (anon key)
│   │   └── supabase-admin.ts       # サーバー専用Supabaseクライアント (service role key)
│   ├── app/
│   │   ├── layout.tsx              # ルートレイアウト (Geistフォント, globals.css読込)
│   │   ├── page.tsx                # ウェルカムページ (/ ルート)
│   │   ├── globals.css             # Tailwind CSS エントリポイント
│   │   ├── actions/
│   │   │   └── cards.ts            # Server Actions (CRUD, 画像アップロード, ダッシュボード統計)
│   │   ├── admin/
│   │   │   ├── layout.tsx          # 管理画面共通レイアウト (Sidebar + main)
│   │   │   ├── page.tsx            # ダッシュボード (統計 + 直近クリックログ)
│   │   │   └── cards/
│   │   │       ├── page.tsx        # カード一覧 (SSR → CardList クライアントコンポーネント)
│   │   │       ├── new/
│   │   │       │   └── page.tsx    # 新規作成フォーム + リアルタイムXカードプレビュー
│   │   │       └── [id]/
│   │   │           └── edit/
│   │   │               └── page.tsx # 編集ページ (SSR → EditCardForm クライアントコンポーネント)
│   │   └── x/
│   │       └── [slug]/
│   │           └── page.tsx        # 公開カードページ (クローラー判定 + リダイレクト + クリックログ保存)
│   └── components/
│       └── admin/
│           ├── Sidebar.tsx         # サイドバー (レスポンシブ, モバイルドロワー)
│           ├── CardList.tsx        # カード一覧のクライアントコンポーネント (検索, コピー, 削除モーダル)
│           └── EditCardForm.tsx    # 編集フォームのクライアントコンポーネント (画像差し替え対応)
└── README.md                       # セットアップ・デプロイ・利用方法ドキュメント
```

---

## 3. 完了済みの作業 ✅

以下はすべて実装済みで、`npm run lint` / `npm run build` もパスしています。

1. **DBスキーマ** (`supabase/migrations.sql`) — `cards` / `click_logs` テーブル、インデックス、RLS有効化
2. **Supabaseクライアント** (`src/lib/supabase.ts`, `src/lib/supabase-admin.ts`) — ビルド時プレースホルダー付き
3. **Server Actions** (`src/app/actions/cards.ts`) — 画像アップロード、CRUD、ダッシュボード統計取得
4. **管理画面レイアウト** (`src/app/admin/layout.tsx`, `src/components/admin/Sidebar.tsx`)
5. **ダッシュボード** (`src/app/admin/page.tsx`) — 統計カード + 画像サムネイル付き直近クリックログテーブル
6. **カード作成フォーム** (`src/app/admin/cards/new/page.tsx`) — ドラッグ&ドロップ画像アップロード + リアルタイムXカードプレビュー
7. **カード一覧** (`src/app/admin/cards/page.tsx`, `src/components/admin/CardList.tsx`) — 検索、URLコピー、削除確認モーダル
8. **カード編集** (`src/app/admin/cards/[id]/edit/page.tsx`, `src/components/admin/EditCardForm.tsx`)
9. **公開カードページ** (`src/app/x/[slug]/page.tsx`) — OGP/TwitterCardメタタグ出力、クローラー検知、IPハッシュ化、クリックログ保存、リダイレクト
10. **README.md** — セットアップ手順、Xでの使い方、セキュリティ注意点
11. **`.env.example`** — 環境変数テンプレート
12. **`package.json`** に `electron` の devDependency と `"main": "electron.js"`, `"desktop": "electron ."` スクリプトを追加済み
13. **`electron.js`** — `npm run desktop` で Next.js 開発サーバーを自動起動し、Electron ウィンドウで `/admin` を表示
14. **UI日本語化** — 残っていた主要な英語表記を日本語へ変更済み
15. **README.md** — デスクトップアプリとしての起動手順を追記済み
16. **ローカルテストモード** (`src/lib/local-store.ts`) — Supabase 未設定時に `.local-data/db.json` と `public/local-card-images/` でカード作成・編集・削除・クリックログをテスト可能
17. **管理画面保護** (`middleware.ts`) — `/admin` 配下を Basic 認証で保護。本番では `ADMIN_PASSWORD` 未設定時に `/admin` が 503 になる
18. **アプリメタデータ** (`src/app/layout.tsx`) — ブラウザ/Electron のタイトルを `X画像リンクカード生成ツール` に設定済み

---

## 4. 現在の完成状態 ✅

引き継ぎ時点で残っていたタスクは実装済みです。

1. **Electron メインプロセス** (`electron.js`)
   - `npm run desktop` で Next.js 開発サーバーをバックグラウンド起動
   - `http://localhost:3000` の応答を待ってから `/admin` を Electron ウィンドウで表示
   - ウィンドウ終了時に Next.js 子プロセスを停止
   - Windows 向けに `shell: true` と `taskkill` を利用

2. **ダッシュボード画像表示**
   - `getDashboardStats()` で `cards.image_url` を取得
   - 直近クリックログテーブルの先頭に「画像」列を追加
   - 画像がない場合はプレースホルダーを表示

3. **UI 日本語化**
   - サイドバー、トップページ、カードプレビュー、公開カードページの主要英語表記を日本語化
   - クリックログのアクセス元列を日本語表記へ変更

4. **README 更新**
   - デスクトップアプリとしての起動手順を追記

---

## 5. 実装上の注意事項

### セキュリティルール (厳守)
- `SUPABASE_SERVICE_ROLE_KEY` は **サーバー側のみ** で使用する (`src/lib/supabase-admin.ts` / `src/app/actions/cards.ts`)
- `electron.js` は Node.js プロセスなので service role key にアクセス可能だが、**レンダラープロセスに露出させない**
- `destination_url` は必ず `http://` または `https://` のみ許可する (`javascript:`, `data:` は拒否)
- IPアドレスは SHA-256 でハッシュ化してから保存する

### Electron の注意点
- `electron.js` は CommonJS (`require`) で記述する (ESM ではない)
- Next.js サーバーの起動を `child_process.spawn('npm', ['run', 'dev'], ...)` で行う
- Windowsでは `spawn` の `shell: true` オプションが必要
- ポート3000の準備完了判定は `http://localhost:3000` への fetch が成功するまで繰り返しリトライする (500ms間隔, 最大60秒)
- アプリ終了時は `childProcess.kill()` を確実に呼ぶ。Windowsでは `taskkill` が必要になる場合がある

### Tailwind CSS v4
- このプロジェクトは Tailwind CSS v4 を使用している (`@import "tailwindcss"` 形式)
- `tailwind.config.js` は存在しない (v4 では不要)
- テーマカスタマイズは `globals.css` 内の `@theme inline {}` ブロックで行う

### Next.js App Router のパターン
- Server Components (デフォルト) と Client Components (`'use client'`) を使い分けている
- データ取得は Server Components 側で行い、インタラクティブなUIは Client Components で実装
- データ変更は `'use server'` の Server Actions (`src/app/actions/cards.ts`) を経由

---

## 6. 検証チェックリスト

現在の検証結果:

- [x] `npm run lint` がエラーなく成功する
- [x] `npm run build` がエラーなく成功する
- [x] `node --check electron.js` がエラーなく成功する
- [x] `npm run desktop:prepare` がエラーなく成功する
- [x] Supabase 未設定のローカルテストモードで `/admin` が HTTP 200 を返す
- [x] ダッシュボードの直近クリックログテーブルに画像サムネイル列がある
- [x] サイドバーの状態表示が日本語になっている
- [x] サイドバーのサブタイトルが日本語になっている
- [x] ウェルカムページのバッジ・フッターが日本語になっている
- [x] プレビューのヘッダーが「X (旧Twitter) カードプレビュー」になっている
- [x] README.md にデスクトップ起動の手順が記載されている

GUI を開く `npm run desktop` は手動確認が必要です。実行すると Electron ウィンドウが開き、プロセスが常駐します。

---

## 7. 環境変数 (.env)

実行には以下の環境変数が必要 (`.env.example` 参照):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=推測されにくいパスワード
```

環境変数が設定されていなくてもローカル開発ではテストモードで動作する。本番環境では Supabase 関連の値と `ADMIN_PASSWORD` を必ず設定すること。
