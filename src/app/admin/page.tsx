import React from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Layers, 
  MousePointerClick, 
  Calendar,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { getDashboardStats } from '@/app/actions/cards';

// データを動的に取得するため dynamic を指定
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">ダッシュボード</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">画像リンクカードの使用状況とリアルタイムのクリック統計</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/cards/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 duration-200"
          >
            <PlusCircle className="w-4 h-4" />
            新規カード作成
          </Link>
        </div>
      </div>

      {/* スタッツグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 作成済みカード数カード */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">作成済みカード</span>
              <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.totalCards}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
            <span className="text-slate-400">リンク付き中継URLの総数</span>
            <Link 
              href="/admin/cards" 
              className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5 hover:underline"
            >
              カード一覧を表示 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 総クリック数カード */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">総クリック数</span>
              <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.totalClicks}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <MousePointerClick className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
            <span className="text-slate-400">全カードを通過したリダイレクト数</span>
            <span className="text-slate-500 font-medium flex items-center gap-1">
              平均: {stats.totalCards > 0 ? (stats.totalClicks / stats.totalCards).toFixed(1) : 0} 回/カード
            </span>
          </div>
        </div>
      </div>

      {/* 直近のクリックイベントログ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">直近のクリックイベント (最近5件)</h2>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-pointer" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-60 p-2.5 bg-slate-800 text-white text-[11px] rounded-lg shadow-xl leading-relaxed z-10">
                Xクローラー以外の一般ユーザーのアクセスログです。IPアドレスはハッシュ化（SHA-256）して安全に保存されています。
              </div>
            </div>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-semibold">リアルタイム</span>
        </div>

        {stats.recentClicks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
              <MousePointerClick className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium text-sm">クリックデータはまだ記録されていません</p>
            <p className="text-slate-400 text-xs mt-1">X等で生成されたURLを投稿し、ユーザーがクリックするとここに表示されます</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 font-semibold text-xs border-b border-slate-100">
                  <th className="px-6 py-4">画像</th>
                  <th className="px-6 py-4">対象カード</th>
                  <th className="px-6 py-4">スラッグ</th>
                  <th className="px-6 py-4">アクセス元</th>
                  <th className="px-6 py-4">リファラ</th>
                  <th className="px-6 py-4">クリック日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {stats.recentClicks.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {log.cardImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={log.cardImageUrl}
                          alt={log.cardTitle}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 max-w-[200px] truncate">
                      {log.cardTitle}
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/x/${log.cardSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                      >
                        /x/{log.cardSlug}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 max-w-[250px] truncate text-slate-500 text-xs" title={log.userAgent}>
                      {log.userAgent}
                    </td>
                    <td className="px-6 py-4 max-w-[150px] truncate text-slate-500 text-xs" title={log.referer}>
                      {log.referer}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(log.clickedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
