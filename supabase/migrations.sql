-- X画像リンクカード生成ツール データベーススキーマ

-- 1. cards テーブル
-- カードのタイトル、説明文、スラッグ、画像URL、リダイレクト先URLを保持
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text not null unique,
  image_url text not null,
  destination_url text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- slugで検索するためインデックスを追加
create index if not exists idx_cards_slug on cards(slug);

-- 2. click_logs テーブル
-- アクセス時のユーザーエージェント、リファラ、IPアドレスのハッシュを保持
create table if not exists click_logs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade not null,
  user_agent text,
  referer text,
  ip_hash text,
  clicked_at timestamp with time zone default now() not null
);

-- card_id で集計するためのインデックスを追加
create index if not exists idx_click_logs_card_id on click_logs(card_id);

-- 期間指定されたクリックをカード別にDB内で集計するためのインデックス
create index if not exists idx_click_logs_clicked_at_card_id
  on click_logs(clicked_at, card_id);

-- アプリへ生ログを返さず、カード別の集計結果だけを返す
create or replace function public.get_card_click_counts(
  p_start timestamp with time zone default null,
  p_end timestamp with time zone default null
)
returns table (
  card_id uuid,
  click_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    click_logs.card_id,
    count(*)::bigint as click_count
  from public.click_logs
  where (p_start is null or click_logs.clicked_at >= p_start)
    and (p_end is null or click_logs.clicked_at < p_end)
  group by click_logs.card_id
  order by click_logs.card_id;
$$;

revoke all on function public.get_card_click_counts(timestamp with time zone, timestamp with time zone)
  from public, anon, authenticated;
grant execute on function public.get_card_click_counts(timestamp with time zone, timestamp with time zone)
  to service_role;

-- 3. 行レベルセキュリティ (RLS) の有効化
-- 今回はすべてサーバー側で Service Role Key を使用して操作するため、
-- クライアント側の直接読み書きは禁止（RLS有効化＆ポリシーなし）とします。
-- これにより、安全にデータを保護できます。
alter table cards enable row level security;
alter table click_logs enable row level security;

-- 4. Supabase Storage の注意点
-- 'card-images' という名前で公開（Public）バケットを作成してください。
-- バケットのRLSを有効にし、画像の挿入・削除は Service Role でのみ行えるようにし、
-- 読み込みは公開（Public）に設定します。
