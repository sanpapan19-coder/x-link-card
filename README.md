# X画像リンクカード生成ツール (X Image Link Card Generator)

X (旧Twitter) で大きな画像リンク付きの投稿用カード（Twitter Card）を表示させ、タップしたユーザーを指定したURLへリダイレクトしてクリック数を測定する中継URL生成・管理システムです。

## 🚀 ツール概要

通常、Xで画像を直接アップロードすると、画像をタップした際は画像の拡大表示（ビューア）が開くだけで、外部サイトへ誘導することはできません。
本ツールは、Xのクローラーには OGP と Twitter Card メタタグを含むHTMLを返し、一般ユーザーにはクリックログを記録したうえで瞬時に指定URLへ転送する「中継URL」を発行することで、画像をタップしたユーザーを直接任意のサイトへ送客できるようにします。

---

## 🛠️ 技術構成

- **Framework**: Next.js (App Router) + TypeScript
- **CSS Styling**: Tailwind CSS (v4)
- **Database / Storage**: Supabase
- **Hosting**: Vercel (デプロイ前提)

---

## ⚙️ セットアップ手順

### 1. リポジトリの準備 & 依存関係のインストール

```bash
# パッケージのインストール
npm install
```

### 2. Supabase データベース設定

Supabase Dashboard にて新規プロジェクトを作成し、**SQL Editor** を開いて [supabase/migrations.sql](supabase/migrations.sql) の内容を貼り付けて実行します。

これにより、以下のテーブルとインデックスが自動的に構成されます：
- `cards` テーブル (カード設定情報)
- `click_logs` テーブル (クリックログ情報)

※ 行レベルセキュリティ (RLS) は有効化されますが、Next.js サーバーサイド (Service Role) を経由してデータ操作を行うため、クライアントポリシーの作成は不要です。

### 3. Supabase Storage バケット作成

画像をアップロードするためのバケットを作成します。

1. Supabase Dashboard の **Storage** メニューを開きます。
2. **New Bucket** ボタンをクリックします。
3. バケット名に `card-images` を入力します。
4. **Public bucket** (公開バケット) に設定します。
5. **Save** をクリックして作成します。

### 4. 環境変数の設定

プロジェクトのルートディレクトリに `.env` ファイルを新規作成し、以下の環境変数を設定してください（`.env.example` を参考にしてください）。

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# サーバーサイド専用の管理者キー (RLSをバイパスします)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# アプリのルートURL
# ローカル開発環境: http://localhost:3000
# 本番環境: https://your-domain.vercel.app (末尾のスラッシュは不要)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 管理画面 (/admin) のBasic認証
# 本番環境では必ず推測されにくいパスワードに変更してください
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

`.env` をまだ作成していない場合でも、ローカルではテストモードとして動作します。
この場合、カード情報は `.local-data/db.json` に保存され、アップロード画像は `public/local-card-images/` に保存されます。
本番利用や別端末との共有には Supabase の実設定を使用してください。

---

## 💻 開発・ビルド方法

### ローカルでの起動

```bash
# 開発サーバーの起動
npm run dev
```

起動後、[http://localhost:3000/admin](http://localhost:3000/admin) にアクセスすると管理画面が表示されます。

### デスクトップアプリとして起動

コマンドラインの操作に慣れていない方は、以下のコマンド1つでデスクトップウィンドウが自動的に開きます。

```bash
npm run desktop
```

バックグラウンドで Next.js 開発サーバーが自動起動し、管理画面がデスクトップウィンドウ内に表示されます。
ウィンドウを閉じると、バックグラウンドのサーバーも自動的に停止します。

### 本番ビルド検証

```bash
# プロジェクトのビルド
npm run build
```

---

## 🌐 Vercel デプロイ方法

1. [Vercel Dashboard](https://vercel.com) から新しいプロジェクトを作成し、このリポジトリをインポートします。
2. **Environment Variables** (環境変数) に、上記 `.env` で設定した以下の6つの環境変数を入力します：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (本番のデプロイURL `https://your-domain.vercel.app` に設定してください)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
3. **Deploy** を実行します。

本番環境で `ADMIN_PASSWORD` が未設定の場合、管理画面 `/admin` は安全のため `503` を返します。
公開URLとして使う `/x/[slug]` は認証なしでアクセスできます。

---

## 📝 X (Twitter) で投稿する使い方

1. 管理画面 (`/admin/cards/new`) にアクセスし、**タイトル**、**説明文**、**スラッグ**、**遷移先URL**、**表示画像** を指定してカードを作成します。
2. カードが作成されたら、一覧画面 (`/admin/cards`) で該当カードの「中継URL」の **URLコピーボタン** を押してコピーします (例: `https://your-domain.vercel.app/x/pc-sale`)。
3. コピーしたURLを **Xの投稿本文に貼り付けて投稿** します。
4. Xのクローラーが自動的にURLを読み込み、X上のタイムラインに指定した画像とタイトルが大きなリンクカード (Summary Large Image) としてレンダリングされます。
5. 他のユーザーがその画像カードをタップすると、最終的に設定済みの **遷移先URL** へ自動的に遷移します。

> [!WARNING]
> **重要: 画像は直接添付しないでください**
> Xの投稿作成時にPCやスマホから画像を直接添付してしまうと、画像タップ時にXの画像ビューアが開くだけで、外部URLへは遷移しません。
> **必ず生成された中継URLのみを投稿本文に貼り付けてください。**

---

## 🔒 セキュリティ・安全性について

- **URLインジェクションの排除**: 遷移先URL (`destination_url`) には `http://` または `https://` で始まる正しいURLのみ許可します。`javascript:` や `data:` スキーマなどの悪意あるURLは保存・実行時に弾かれます。
- **プライバシー保護 (IPハッシュ化)**: クリックログを収集する際、接続元のIPアドレスはそのまま保存せず、SHA-256を用いて不可逆なハッシュ値に変換して保存します。
- **Service Role Key の安全な管理**: データベース書き込み用の特権キーである `SUPABASE_SERVICE_ROLE_KEY` は、Next.js のサーバーサイド（Server Actions / Route Handlers）でのみ参照されます。クライアント側のJSコードに露出することはありません。
- **管理画面の保護**: `/admin` 配下は Basic 認証で保護されます。`ADMIN_USERNAME` と `ADMIN_PASSWORD` を本番環境に設定してください。
