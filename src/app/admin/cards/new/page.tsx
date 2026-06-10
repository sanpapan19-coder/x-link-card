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
  Settings
} from 'lucide-react';
import { createCardAction } from '@/app/actions/cards';

const LAST_DESTINATION_URL_KEY = 'post-tool:last-destination-url';

export default function NewCardPage() {
  const router = useRouter();

  // フォームの状態 (リアルタイムプレビュー用)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedDestinationUrl = window.localStorage.getItem(LAST_DESTINATION_URL_KEY);
      if (savedDestinationUrl) {
        setDestinationUrl(savedDestinationUrl);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleDestinationUrlChange = (value: string) => {
    setDestinationUrl(value);

    if (value.trim()) {
      window.localStorage.setItem(LAST_DESTINATION_URL_KEY, value);
    } else {
      window.localStorage.removeItem(LAST_DESTINATION_URL_KEY);
    }
  };

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
    if (!imageFile) {
      setStatusMessage({ type: 'error', text: '画像を選択してください。' });
      setIsPending(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('slug', slug);
    formData.append('destination_url', destinationUrl);
    formData.append('image', imageFile);

    try {
      const result = await createCardAction(formData);
      if (result.success) {
        setStatusMessage({ type: 'success', text: 'カードを作成しました！一覧へ戻ります...' });
        setTimeout(() => {
          router.push('/admin/cards');
        }, 1500);
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'エラーが発生しました。' });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '予期せぬエラーが発生しました。',
      });
    } finally {
      setIsPending(false);
    }
  };

  // メモリリーク防止のためプレビューURLをクリーンアップ
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">新規カード作成</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Xで画像リンクカードとして機能する中継用URLを新しく登録します</p>
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

      {/* コンテンツグリッド: フォームとリアルタイムプレビュー */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左側: フォーム入力 (コラム数: 7) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-5">
            {/* 画像アップロード */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                カード表示用画像 <span className="text-rose-500 text-xs font-bold">必須</span>
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
                    <p className="text-xs text-slate-400 font-medium">
                      ファイルをドラッグまたはクリックして差し替え (現在のファイル: {imageFile?.name})
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
                    <div className="text-[10px] text-slate-400 bg-slate-50 inline-block px-3 py-1 rounded-full border border-slate-100">
                      推奨比率: 1.91:1 (X Summary Large Image用)
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
                半角英数字、ハイフン、アンダースコアのみ使用可能。重複は禁止です。
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
                  onChange={(e) => handleDestinationUrlChange(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <p className="text-xs text-slate-400">
                ユーザーが画像カードをタップした際の最終遷移先 (http:// または https:// で始まるURL)
              </p>
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
              <p className="text-xs text-slate-400">Xカードに表示されるメインタイトル</p>
            </div>

            {/* 説明文 (Description) */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                説明文 (Description) <span className="text-slate-400 text-xs font-medium">任意</span>
              </label>
              <textarea
                id="description"
                placeholder="限定パソコンが最大50%OFF。このリンクからの購入でさらに限定特典をプレゼント。"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
              <p className="text-xs text-slate-400">Xカードに表示される補足説明（Xの表示仕様上、省略される場合があります）</p>
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
              {isPending ? 'アップロード＆保存中...' : 'カードを作成して保存'}
            </button>
            <Link
              href="/admin/cards"
              className="inline-flex justify-center items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
            >
              キャンセル
            </Link>
          </div>
        </form>

        {/* 右側: リアルタイムプレビュー (コラム数: 5) */}
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
                  <p className="text-xs font-semibold">画像アップロード時に表示されます</p>
                </div>
              )}
            </div>

            {/* テキスト詳細エリア */}
            <div className="p-4 space-y-1.5 bg-white">
              {/* ドメイン名 */}
              <div className="text-[12px] text-slate-400 tracking-wide font-normal uppercase truncate">
                {hostName}
              </div>

              {/* タイトル */}
              <div className="text-[14px] font-bold text-slate-800 leading-snug line-clamp-2">
                {title || '（タイトルがここに表示されます）'}
              </div>

              {/* 説明文 */}
              <div className="text-[12px] text-slate-500 leading-normal line-clamp-2">
                {description || '（説明文がここに表示されます。Xの表示形式によっては非表示になる場合があります）'}
              </div>
            </div>
          </div>

          {/* 補足説明 */}
          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 space-y-2.5 text-xs text-indigo-800 max-w-md leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold">
              <Settings className="w-4 h-4 text-indigo-600" />
              生成されるURLと動作
            </div>
            <p>
              保存すると中継URL <strong>{hostName}/x/{slug || '【スラッグ】'}</strong> が生成されます。
            </p>
            <p>
              このURLをXに貼ると、上記のプレビューの形で投稿にカードが表示されます。ユーザーがカード画像をタップすると、<strong>{destinationUrl || '【遷移先URL】'}</strong> へ自動転送されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
