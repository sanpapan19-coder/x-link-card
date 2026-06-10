import React from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getCards } from '@/app/actions/cards';
import CardList from '@/components/admin/CardList';

// データを常に最新に保つため動的レンダリングを強制
export const dynamic = 'force-dynamic';

export default async function CardsPage() {
  const cards = await getCards();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">カード一覧</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">作成されたX画像リンクカードとクリック計測URLの管理</p>
        </div>
        <Link
          href="/admin/cards/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 duration-200"
        >
          <PlusCircle className="w-4 h-4" />
          新規カード作成
        </Link>
      </div>

      {/* カードリスト */}
      <CardList initialCards={cards} />
    </div>
  );
}
