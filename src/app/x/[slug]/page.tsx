import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { addLocalClickLog, getLocalCardBySlug, isLocalStoreEnabled } from '@/lib/local-store';

export const dynamic = 'force-dynamic';

interface RedirectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 遷移先URLのバリデーション (セキュリティ対策)
function isSafeUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  const lowerUrl = urlStr.toLowerCase().trim();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
    return false;
  }
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 1. OGP / Twitter Card メタデータの動的生成 (クローラーが最初に読み取る部分)
 */
export async function generateMetadata({ params }: RedirectPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (isLocalStoreEnabled()) {
    const card = await getLocalCardBySlug(slug);

    if (!card) {
      return {};
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pageUrl = `${siteUrl}/x/${card.slug}`;

    return {
      title: card.title,
      description: card.description || undefined,
      openGraph: {
        type: 'website',
        title: card.title,
        description: card.description || undefined,
        images: [card.image_url],
        url: pageUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: card.title,
        description: card.description || undefined,
        images: [card.image_url],
      },
    };
  }
  
  // DBからカード情報を取得
  const { data: card } = await supabaseAdmin
    .from('cards')
    .select('title, description, image_url, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (!card) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pageUrl = `${siteUrl}/x/${card.slug}`;

  return {
    title: card.title,
    description: card.description || undefined,
    openGraph: {
      type: 'website',
      title: card.title,
      description: card.description || undefined,
      images: [card.image_url],
      url: pageUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: card.title,
      description: card.description || undefined,
      images: [card.image_url],
    },
  };
}

/**
 * 2. ページ本体 (クローラー判定、クリックログ記録、リダイレクト処理)
 */
export default async function RedirectPage({ params }: RedirectPageProps) {
  const { slug } = await params;
  
  // DBからカード情報を取得
  const card = isLocalStoreEnabled()
    ? await getLocalCardBySlug(slug)
    : (await supabaseAdmin
        .from('cards')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()).data;

  if (!card) {
    notFound();
  }

  // リクエストヘッダーの取得
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || '';
  const referer = headerList.get('referer') || '';
  
  // IPアドレスの取得とハッシュ化 (プライバシー保護)
  const rawIp = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || '';
  const ipHash = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex') : null;

  // クローラー判定用のUser-Agentリスト
  const crawlerAgents = [
    'twitterbot',
    'xbot',
    'facebookexternalhit',
    'slackbot',
    'discordbot',
    'linkedinbot',
    'whatsapp'
  ];

  const isCrawler = crawlerAgents.some(agent => userAgent.toLowerCase().includes(agent));

  if (isCrawler) {
    // クローラーの場合はリダイレクトさせず、メタデータを含むHTMLコンテンツを返す
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-center">
          <div className="aspect-[1.91/1] rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.image_url} alt={card.title} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              クローラーモード
            </span>
            <h1 className="text-xl font-bold text-slate-900 leading-snug pt-2">{card.title}</h1>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{card.description}</p>
          </div>
          <div className="pt-4 border-t border-slate-50">
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              クローラー(Bot)によるアクセスを検知しました。<br />
              メタタグ(OGP / Twitter Card)情報を正常に出力しています。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // セキュリティチェック: 遷移先URLが安全な形式か検証
  if (!isSafeUrl(card.destination_url)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-rose-100 shadow-lg text-center space-y-4">
          <div className="inline-flex p-3.5 bg-rose-50 text-rose-600 rounded-full">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">安全ではないURLへのリダイレクトがブロックされました</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            設定されている遷移先URLのプロトコルが不正です。セキュアな http または https URLのみリダイレクトが許可されています。
          </p>
        </div>
      </div>
    );
  }

  // 一般ユーザーの場合は、クリックログを非同期で保存した上でリダイレクトする
  try {
    if (isLocalStoreEnabled()) {
      await addLocalClickLog({
        card_id: card.id,
        user_agent: userAgent || null,
        referer: referer || null,
        ip_hash: ipHash
      });
    } else {
      const { error: logError } = await supabaseAdmin
        .from('click_logs')
        .insert({
          card_id: card.id,
          user_agent: userAgent || null,
          referer: referer || null,
          ip_hash: ipHash
        });

      if (logError) {
        console.error('Failed to save click log:', logError);
      }
    }
  } catch (err) {
    console.error('Error saving click log:', err);
  }

  // リダイレクトの実行
  redirect(card.destination_url);

  // redirect() が例外を投げるため通常はここには到達しませんが、
  // クライアント側でJSが動作した場合のフォールバック画面を出力しておきます。
  return (
    <html lang="ja">
      <head>
        <meta httpEquiv="refresh" content={`0;url=${card.destination_url}`} />
        <title>リダイレクト中 - {card.title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.href = ${JSON.stringify(card.destination_url)};`,
          }}
        />
      </head>
      <body className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-sans">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold">ページを移動しています。しばらくお待ちください...</p>
          <p className="text-xs text-slate-400">
            自動で切り替わらない場合は、<a href={card.destination_url} className="text-indigo-600 hover:underline font-bold">こちらをクリック</a>してください。
          </p>
        </div>
      </body>
    </html>
  );
}
