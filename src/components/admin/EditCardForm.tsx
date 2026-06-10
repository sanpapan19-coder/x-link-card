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
  Image as ImageIcon
} from 'lucide-react';
import { Card } from '@/types';
import { updateCardAction } from '@/app/actions/cards';

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
  
  // 画像関連の状態
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(card.image_url);
  const [dragActive, setDragActive] = useState(false);

  // フィードバック表示用
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  // サイトURLホスト名の取得 (プレビュー表示用)
  const [hostName, setHostName] = useState('example.com');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => setHostName(window.location.host), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // 画像選択時の処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setStatusMessage({ type: 'error', text: '画像ファイルを選択してください。' });
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  // ドラッグ＆ドロップの処理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setStatusMessage({ type: 'error', text: '画像ファイルを選択してください。' });
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsPending(true);

    // クライアント側簡易バリデーション
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'タイトルは必須です。' });
      setIsPending(false);
      return;
    }
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
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50/20' 
                    : imageFile 
                      ? 'border-slate-200 hover:border-slate-300' 
                      : 'border-slate-200 hover:border-indigo-400 bg-slate-50/30'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {imagePreviewUrl ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video max-w-sm mx-auto rounded-lg overflow-hidden border border-slate-100 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imagePreviewUrl} 
                        alt="アップロード画像" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      {imageFile ? `変更予定: ${imageFile.name}` : '現在の画像を保持中。クリックまたはドラッグで画像を差し替え'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="inline-flex p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">画像をここにドラッグ＆ドロップ</p>
                      <p className="text-xs text-slate-400 mt-1">または、クリックしてファイルを選択</p>
                    </div>
                  </div>
                )}
              </div>
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
                タイトル (Title) <span className="text-rose-500 text-xs font-bold">必須</span>
              </label>
              <input
                type="text"
                id="title"
                placeholder="初夏の大感謝セール開催中！"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                required
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
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 inline-flex justify-center items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 ${
                isPending ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isPending ? '保存中...' : '変更を保存'}
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
              <div className="text-[14px] font-bold text-slate-800 leading-snug line-clamp-2">
                {title || '（タイトルがここに表示されます）'}
              </div>
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
