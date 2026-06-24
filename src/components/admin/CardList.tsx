'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Copy, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  MousePointerClick, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  Layers
} from 'lucide-react';
import { CardWithClickCount } from '@/types';
import { deleteCardAction } from '@/app/actions/cards';
import { buildXPostText, getStoredPostText } from '@/lib/post-text-store';

interface CardListProps {
  initialCards: CardWithClickCount[];
}

export default function CardList({ initialCards }: CardListProps) {
  const router = useRouter();
  const [cards, setCards] = useState<CardWithClickCount[]>(initialCards);
  const [searchTerm, setSearchTerm] = useState('');
  const postTextBySlug = React.useMemo(
    () => Object.fromEntries(cards.map((card) => [card.slug, getStoredPostText(card.slug)])),
    [cards]
  );
  
  // 削除モーダル用の状態
  const [deleteTarget, setDeleteTarget] = useState<CardWithClickCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // フィードバック表示
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // トースト自動消去
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  // URLのコピー処理
  const handleCopyLink = (slug: string) => {
    if (typeof window !== 'undefined') {
      const absoluteUrl = `${window.location.origin}/x/${slug}`;
      navigator.clipboard.writeText(absoluteUrl)
        .then(() => {
          showToast('success', 'URLをクリップボードにコピーしました！');
        })
        .catch(() => {
          showToast('error', 'URLのコピーに失敗しました。');
        });
    }
  };

  const handleCopyPostText = (slug: string) => {
    if (typeof window === 'undefined') return;

    const postText = postTextBySlug[slug] || '';
    if (!postText.trim()) {
      showToast('error', '保存済みの投稿文がありません。編集画面で入力してください。');
      return;
    }

    const xPostText = buildXPostText(postText, slug, window.location.origin);
    navigator.clipboard.writeText(xPostText)
      .then(() => {
        showToast('success', 'X投稿用テキストをコピーしました。');
      })
      .catch(() => {
        showToast('error', '投稿文のコピーに失敗しました。');
      });
  };

  // 削除の実行
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteCardAction(deleteTarget.id);
      if (result.success) {
        showToast('success', `カード「${deleteTarget.title || 'タイトルなし'}」を削除しました。`);
        setCards(cards.filter(c => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        router.refresh();
      } else {
        showToast('error', result.error || '削除に失敗しました。');
      }
    } catch {
      showToast('error', '削除処理中にエラーが発生しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  // 検索フィルタリング
  const filteredCards = cards.filter(card => {
    const term = searchTerm.toLowerCase();
    return (
      card.title.toLowerCase().includes(term) ||
      (card.description || '').toLowerCase().includes(term) ||
      card.slug.toLowerCase().includes(term) ||
      card.destination_url.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* 検索・ツールバー */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="カードを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold self-end sm:self-center">
          全 {filteredCards.length} 件を表示中
        </div>
      </div>

      {/* トースト表示 */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl flex items-center gap-2.5 shadow-xl border animate-in slide-in-from-bottom duration-300 ${
          toast.type === 'success' 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* カード一覧グリッド */}
      {filteredCards.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-20 text-center shadow-sm">
          <div className="inline-flex p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
            <Layers className="w-8 h-8" />
          </div>
          <p className="text-slate-500 font-medium text-sm">カードが見つかりません</p>
          <p className="text-slate-400 text-xs mt-1">
            {searchTerm ? '検索条件を変更してお試しください' : '右上のボタンから最初のカードを作成しましょう'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            return (
              <div 
                key={card.id} 
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
              >
                {/* 画像プレビュー */}
                <div className="aspect-[1.91/1] bg-slate-100 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={card.image_url} 
                    alt={card.title || 'カード画像'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-slate-900/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-indigo-400" />
                    {card.click_count} クリック
                  </div>
                </div>

                {/* 情報 */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-1" title={card.title || 'タイトルなし'}>
                      {card.title || 'タイトルなし'}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                      {card.description || '説明文なし'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-50 text-xs">
                    {/* 中継URL */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-medium shrink-0">中継URL</span>
                      <div className="flex items-center gap-1 max-w-[70%]">
                        <span className="text-indigo-600 font-bold truncate">/x/{card.slug}</span>
                        <button 
                          onClick={() => handleCopyLink(card.slug)}
                          className="p-1 hover:bg-indigo-50 text-indigo-500 rounded transition-colors"
                          title="URLをコピー"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 遷移先 */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-medium shrink-0">遷移先</span>
                      <a 
                        href={card.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-0.5 truncate max-w-[70%] hover:underline"
                        title={card.destination_url}
                      >
                        <span className="truncate">{card.destination_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    {/* 作成日 */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">登録日</span>
                      <span className="text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {formatDate(card.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => handleCopyPostText(card.slug)}
                      disabled={!postTextBySlug[card.slug]}
                      className="inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                      title={postTextBySlug[card.slug] ? 'X投稿用テキストをコピー' : '保存済みの投稿文がありません'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      投稿文
                    </button>
                    <Link
                      href={`/admin/cards/${card.id}/edit`}
                      className="inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      編集
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(card)}
                      className="inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      削除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0 h-fit">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-slate-900 text-lg">カードを削除しますか？</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  カード「<strong>{deleteTarget.title || 'タイトルなし'}</strong>」を削除すると、この中継URL（/x/{deleteTarget.slug}）は機能しなくなり、蓄積されたすべてのクリックログも完全に削除されます。この操作は取り消せません。
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className={`px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-rose-100 ${
                  isDeleting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? '削除中...' : '完全に削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
