import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-sans relative overflow-hidden">
      {/* 背景の光彩エフェクト */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/40 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-200/40 rounded-full filter blur-3xl pointer-events-none"></div>

      {/* ヘッダー */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">X-Link Card</span>
        </div>
        <Link 
          href="/admin" 
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
        >
          管理画面を開く
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* メインヒーローエリア */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <div className="max-w-3xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/60 rounded-full px-4.5 py-1.5 text-xs text-indigo-700 font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              X (旧Twitter) カードメタタグ生成ツール
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Xの投稿画像を<br className="sm:hidden" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">リンク付きカード</span>にする
            </h1>
            <p className="max-w-xl mx-auto text-slate-500 text-sm sm:text-base md:text-lg leading-relaxed">
              X (旧Twitter) 上で画像をタップしたユーザーを、任意の遷移先URLへ自動転送する中継URLを生成・管理します。Xクローラーの自動検知と詳細なリダイレクト統計機能を備えています。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-100 hover:shadow-indigo-200 duration-200"
            >
              管理画面ダッシュボードへ
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-8 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
            >
              ドキュメント
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 z-10">
        <p>© 2026 Xリンクカード生成ツール — Next.js & Supabase</p>
      </footer>
    </div>
  );
}
