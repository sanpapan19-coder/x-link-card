'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Upload, 
  Link2, 
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Eye,
  Settings,
  Clipboard
} from 'lucide-react';
import { Card } from '@/types';
import { updateCardAction } from '@/app/actions/cards';
import CardImageEditor from '@/components/admin/CardImageEditor';
import { buildXPostText, getStoredPostText, moveStoredPostText } from '@/lib/post-text-store';

interface EditCardFormProps {
  card: Card;
}

export default function EditCardForm({ card }: EditCardFormProps) {
  const router = useRouter();

  // フォームの状態 (リアルタイムプレビュー用。初期値は既存のカードデータ)
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [slug, setSlug] = useState(card.slug);
  const [destinationUrl, setDestinationUrl] = useState(card.destination_url);
  const [postText, setPostText] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  
  // 画像関連の状態
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(card.image_url);
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  // フィードバック表示用
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  // サイトURLホスト名の取得 (プレビュー表示用)
  const [hostName, setHostName] = useState('example.com');
  const [siteOrigin, setSiteOrigin] = useState('https://example.com');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        setHostName(window.location.host);
        setSiteOrigin(window.location.origin);
        setPostText(getStoredPostText(card.slug));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [card.slug]);

  const xPostText = buildXPostText(postText, slug, siteOrigin);
  const xPostLength = xPostText.length;

  const handleCopyPostText = async () => {
    if (!xPostText) {
      setCopyMessage('コピーする投稿文がありません。');
      return;
    }

    try {
      await navigator.clipboard.writeText(xPostText);
      setCopyMessage('X投稿用テキストをコピーしました。');
    } catch {
      setCopyMessage('コピーに失敗しました。手動で選択してコピーしてください。');
    }
  };

  const handleProcessedImage = React.useCallback((file: File) => {
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleImageProcessingChange = React.useCallback((processing: boolean) => {
    setIsImageProcessing(processing);
  }, []);

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsPending(true);

    if (isImageProcessing) {
      setStatusMessage({ type: 'error', text: '画像の加工が完了するまでお待ちください。' });
      setIsPending(false);
      return;
    }

    // クライアント側簡易バリデーション
    if (!slug.trim()) {
      setStatusMessage({ type: 'error', text: 'スラッグは必須です。' });
      setIsPending(false);
      return;
    }
    const slugRegex = /^[a-zA-Z0-9-_]+$/;
    if (!slugRegex.test(slug)) {
      setStatusMessage({ type: 'error', text: 'スラッグは半角英数字、ハイフン、アンダースコアのみ使用可能です。' });
      setIsPending(false);
      return;
    }
    if (!destinationUrl.trim()) {
      setStatusMessage({ type: 'error', text: '遷移先URLは必須です。' });
      setIsPending(false);
      return;
    }
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      setStatusMessage({ type: 'error', text: '遷移先URLは http:// または https:// で始まる必要があります。' });
      setIsPending(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('slug', slug);
    formData.append('destination_url', destinationUrl);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const result = await updateCardAction(card.id, formData);
      if (result.success) {
        moveStoredPostText(card.slug, slug, postText);
        setStatusMessage({ type: 'success', text: 'カードを更新しました！一覧へ戻ります...' });
        setTimeout(() => {
          router.push('/admin/cards');
        }, 1500);
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'エラーが発生しました。' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: '予期せぬエラーが発生しました。' });
    } finally {
      setIsPending(false);
    }
  };

  // メモリリーク防止のため、新しく作ったObjectURLのみクリーンアップする
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl !== card.image_url) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl, card.image_url]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 戻るリンクとヘッダー */}
      <div className="space-y-3">
        <Link 
          href="/admin/cards" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          カード一覧に戻る
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">カードの編集</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">中継カードのタイトル、画像、遷移先URLなどを修正します</p>
        </div>
      </div>

      {/* ステータスメッセージ */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-start gap-3 shadow-sm border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* コンテンツグリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左側: フォーム入力 */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-5">
            {/* 画像アップロード */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                カード表示用画像 <span className="text-slate-400 text-xs font-medium">任意（差し替える場合のみアップロード）</span>
              </label>
              <CardImageEditor
                initialImageUrl={card.image_url}
                onChange={handleProcessedImage}
                onProcessingChange={handleImageProcessingChange}
              />
            </div>

            {/* スラッグ (Slug) */}
            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                スラッグ (Slug) <span className="text-rose-500 text-xs font-bold">必須</span>
              </label>
              <div className="relative rounded-xl shadow-sm flex">
                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium select-none">
                  {hostName}/x/
                </span>
                <input
                  type="text"
                  id="slug"
                  placeholder="pc-sale"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.trim())}
                  className="block w-full min-w-0 flex-1 rounded-none rounded-r-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                変更すると、古いスラッグを使用したURLは機能しなくなります。
              </p>
            </div>

            {/* 遷移先URL (Destination URL) */}
            <div className="space-y-2">
              <label htmlFor="destination_url" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                遷移先 (Destination URL) <span className="text-rose-500 text-xs font-bold">必須</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Link2 className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="url"
                  id="destination_url"
                  placeholder="https://example.com/products/pc-sale-campaign"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* タイトル (Title) */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                タイトル (Title) <span className="text-slate-400 text-xs font-medium">任意</span>
              </label>
              <input
                type="text"
                id="title"
                placeholder="初夏の大感謝セール開催中！"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* 説明文 (Description) */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                説明文 (Description) <span className="text-slate-400 text-xs font-medium">任意</span>
              </label>
              <textarea
                id="description"
                placeholder="限定パソコンが最大50%OFF。"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
            <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="post_text" className="text-sm font-bold text-slate-700">
                    投稿本文確認用
                  </label>
                  <span className={`text-xs font-semibold ${postText.length > 140 ? 'text-rose-600' : 'text-slate-400'}`}>
                    本文 {postText.length}/140文字
                  </span>
                </div>
                <textarea
                  id="post_text"
                  value={postText}
                  onChange={(event) => {
                    setPostText(event.target.value);
                    setCopyMessage('');
                  }}
                  rows={3}
                  placeholder="新規作成時のpostがここに残ります。必要に応じて手直しできます。"
                  className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {postText.length > 140 && (
                  <p className="text-xs font-semibold text-rose-600">
                    投稿本文が140文字を超えています。短くしてください。
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-indigo-100 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="x_post_text" className="text-sm font-bold text-slate-700">
                    X投稿用テキスト
                  </label>
                  <span className={`text-xs font-semibold ${xPostLength > 280 ? 'text-rose-600' : 'text-slate-400'}`}>
                    URL込み {xPostLength}文字
                  </span>
                </div>
                <textarea
                  id="x_post_text"
                  value={xPostText}
                  readOnly
                  rows={5}
                  className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-800 outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    保存すると、この投稿本文もこのPCのブラウザに保存されます。
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPostText}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    投稿文をコピー
                  </button>
                </div>
                {copyMessage && (
                  <p className="text-xs font-semibold text-slate-500">{copyMessage}</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button
              type="submit"
              disabled={isPending || isImageProcessing}
              className={`flex-1 inline-flex justify-center items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 ${
                isPending ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isPending ? '保存中...' : isImageProcessing ? '画像を加工中...' : '変更を保存'}
            </button>
            <Link
              href="/admin/cards"
              className="inline-flex justify-center items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
            >
              キャンセル
            </Link>
          </div>
        </form>

        {/* 右側: リアルタイムプレビュー */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-5">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 px-1">
            <Eye className="w-4 h-4 text-indigo-500" />
            X (旧Twitter) カードプレビュー
          </div>

          {/* Xカード模倣コンポーネント */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 max-w-md">
            {/* 画像エリア */}
            <div className="aspect-[1.91/1] bg-slate-100 relative flex items-center justify-center border-b border-slate-100">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={imagePreviewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-400 space-y-2 p-6">
                  <div className="inline-flex p-2.5 bg-slate-50 rounded-xl text-slate-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold">画像はありません</p>
                </div>
              )}
            </div>

            {/* テキスト詳細エリア */}
            <div className="p-4 space-y-1.5 bg-white">
              <div className="text-[12px] text-slate-400 tracking-wide font-normal uppercase truncate">
                {hostName}
              </div>
              {title.trim() && (
                <div className="text-[14px] font-bold text-slate-800 leading-snug line-clamp-2">
                  {title}
                </div>
              )}
              <div className="text-[12px] text-slate-500 leading-normal line-clamp-2">
                {description || '（説明文がここに表示されます）'}
              </div>
            </div>
          </div>

          {/* 補足説明 */}
          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 space-y-2.5 text-xs text-indigo-800 max-w-md leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold">
              <Settings className="w-4 h-4 text-indigo-600" />
              中継URLの動作
            </div>
            <p>
              保存すると中継URL <strong>{hostName}/x/{slug || '【スラッグ】'}</strong> の設定が更新されます。
            </p>
            <p>
              すでにXに投稿されているカードに対しても、Xのキャッシュ（Card Validatorや再キャッシュ処理）が更新されると、新しいタイトルや画像、リダイレクト先が反映されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
