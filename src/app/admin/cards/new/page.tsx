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
  RefreshCw,
  Save,
  Settings,
  Shuffle,
  Clipboard,
  Sparkles
} from 'lucide-react';
import { createCardAction } from '@/app/actions/cards';
import CardImageEditor from '@/components/admin/CardImageEditor';

const LAST_DESTINATION_URL_KEY = 'post-tool:last-destination-url';
const DESTINATION_URL_POOL_KEY = 'post-tool:destination-url-pool';
const MAX_DESTINATION_URLS = 30;

type GptsCardOutput = {
  title?: unknown;
  description?: unknown;
  post?: unknown;
};

function isValidHttpUrl(value: string): boolean {
  if (value.length > 2048) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseUrlPool(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const invalidLines = lines.filter((line) => !isValidHttpUrl(line));
  const uniqueUrls = [...new Set(lines)];

  return { lines, invalidLines, uniqueUrls };
}

function generateRandomSlug(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  const randomPart = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `x-${randomPart}`;
}

function chooseRandomUrl(urls: string[], currentUrl = ''): string {
  const candidates = urls.length > 1 ? urls.filter((url) => url !== currentUrl) : urls;
  const pool = candidates.length > 0 ? candidates : urls;
  return pool[Math.floor(Math.random() * pool.length)] || '';
}

function normalizeGptsText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default function NewCardPage() {
  const router = useRouter();

  // フォームの状態 (リアルタイムプレビュー用)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [gptsPasteText, setGptsPasteText] = useState('');
  const [postText, setPostText] = useState('');
  const [gptsMessage, setGptsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [urlPoolText, setUrlPoolText] = useState('');
  const [savedUrlCount, setSavedUrlCount] = useState(0);
  const [poolMessage, setPoolMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
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
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const cardUrl = slug.trim() ? `${siteOrigin}/x/${slug.trim()}` : '';
  const xPostText = [postText.trim(), cardUrl].filter(Boolean).join('\n\n');
  const xPostLength = xPostText.length;

  const handleApplyGptsOutput = () => {
    setGptsMessage(null);
    setCopyMessage('');

    if (!gptsPasteText.trim()) {
      setGptsMessage({ type: 'error', text: 'GPTsの出力JSONを貼り付けてください。' });
      return;
    }

    try {
      const parsed = JSON.parse(gptsPasteText) as GptsCardOutput;
      const nextTitle = normalizeGptsText(parsed.title);
      const nextDescription = normalizeGptsText(parsed.description);
      const nextPost = normalizeGptsText(parsed.post);

      if (!nextTitle && !nextDescription && !nextPost) {
        setGptsMessage({
          type: 'error',
          text: 'title、description、post のいずれかを含むJSONを貼り付けてください。',
        });
        return;
      }

      if (nextTitle) setTitle(nextTitle);
      if (nextDescription) setDescription(nextDescription);
      if (nextPost) setPostText(nextPost);

      setGptsMessage({ type: 'success', text: 'GPTs出力をフォームに反映しました。' });
    } catch {
      setGptsMessage({
        type: 'error',
        text: 'JSON形式が正しくありません。GPTsの出力をそのまま貼り付けてください。',
      });
    }
  };

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSlug(generateRandomSlug());

      let savedUrls: string[] = [];
      const storedPool = window.localStorage.getItem(DESTINATION_URL_POOL_KEY);
      if (storedPool) {
        try {
          const parsed = JSON.parse(storedPool);
          if (Array.isArray(parsed)) {
            savedUrls = parsed.filter((url): url is string => typeof url === 'string' && isValidHttpUrl(url));
          }
        } catch {
          savedUrls = [];
        }
      }

      if (savedUrls.length === 0) {
        const previousUrl = window.localStorage.getItem(LAST_DESTINATION_URL_KEY);
        if (previousUrl && isValidHttpUrl(previousUrl)) {
          savedUrls = [previousUrl];
          window.localStorage.setItem(DESTINATION_URL_POOL_KEY, JSON.stringify(savedUrls));
        }
      }

      const limitedUrls = [...new Set(savedUrls)].slice(0, MAX_DESTINATION_URLS);
      window.localStorage.setItem(DESTINATION_URL_POOL_KEY, JSON.stringify(limitedUrls));
      setUrlPoolText(limitedUrls.join('\n'));
      setSavedUrlCount(limitedUrls.length);
      setDestinationUrl(chooseRandomUrl(limitedUrls));
      window.localStorage.removeItem(LAST_DESTINATION_URL_KEY);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleDestinationUrlChange = (value: string) => {
    setDestinationUrl(value);
  };

  const handleSaveUrlPool = () => {
    const { lines, invalidLines, uniqueUrls } = parseUrlPool(urlPoolText);

    if (lines.length === 0) {
      setPoolMessage({ type: 'error', text: '候補URLを1件以上入力してください。' });
      return;
    }

    if (invalidLines.length > 0) {
      setPoolMessage({
        type: 'error',
        text: `http:// または https:// で始まる正しいURLに修正してください（不正: ${invalidLines.length}件）。`,
      });
      return;
    }

    if (uniqueUrls.length > MAX_DESTINATION_URLS) {
      setPoolMessage({ type: 'error', text: `候補URLは最大${MAX_DESTINATION_URLS}件まで登録できます。` });
      return;
    }

    window.localStorage.setItem(DESTINATION_URL_POOL_KEY, JSON.stringify(uniqueUrls));
    setUrlPoolText(uniqueUrls.join('\n'));
    setSavedUrlCount(uniqueUrls.length);
    setDestinationUrl(chooseRandomUrl(uniqueUrls, destinationUrl));
    setPoolMessage({
      type: 'success',
      text:
        lines.length === uniqueUrls.length
          ? `${uniqueUrls.length}件を保存し、遷移先を選択しました。`
          : `重複を除いた${uniqueUrls.length}件を保存し、遷移先を選択しました。`,
    });
  };

  const handleRandomizeDestination = () => {
    const storedPool = window.localStorage.getItem(DESTINATION_URL_POOL_KEY);
    let urls: string[] = [];

    if (storedPool) {
      try {
        const parsed = JSON.parse(storedPool);
        if (Array.isArray(parsed)) {
          urls = [...new Set(
            parsed.filter((url): url is string => typeof url === 'string' && isValidHttpUrl(url))
          )].slice(0, MAX_DESTINATION_URLS);
        }
      } catch {
        urls = [];
      }
    }

    if (urls.length === 0) {
      setPoolMessage({ type: 'error', text: '先に候補URLを保存してください。' });
      return;
    }

    setDestinationUrl(chooseRandomUrl(urls, destinationUrl));
    setPoolMessage({ type: 'success', text: '遷移先URLを選び直しました。' });
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
              <CardImageEditor
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
                  className="block w-full min-w-0 flex-1 rounded-none border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setSlug(generateRandomSlug())}
                  className="inline-flex min-w-11 items-center justify-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                  title="スラッグを再生成"
                  aria-label="スラッグを再生成"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                自動生成されます。必要な場合のみ編集または再生成してください。
              </p>
            </div>

            {/* 遷移先URL候補 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="destination_url_pool" className="text-sm font-bold text-slate-700">
                  遷移先URL候補
                </label>
                <span className="text-xs font-semibold text-slate-400">保存済み {savedUrlCount}/{MAX_DESTINATION_URLS}件</span>
              </div>
              <textarea
                id="destination_url_pool"
                value={urlPoolText}
                onChange={(event) => {
                  setUrlPoolText(event.target.value);
                  setPoolMessage(null);
                }}
                rows={7}
                placeholder={'https://example.com/campaign-a\nhttps://example.com/campaign-b'}
                className="block w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">1行に1件、最大30件まで登録できます。</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUrlPool}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Save className="h-3.5 w-3.5" />
                    候補を保存
                  </button>
                  <button
                    type="button"
                    onClick={handleRandomizeDestination}
                    disabled={savedUrlCount === 0}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    再抽選
                  </button>
                </div>
              </div>
              {poolMessage && (
                <p className={`text-xs font-semibold ${poolMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {poolMessage.text}
                </p>
              )}
            </div>

            {/* 遷移先URL (Destination URL) */}
            <div className="space-y-2">
              <label htmlFor="destination_url" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                今回選択された遷移先 <span className="text-rose-500 text-xs font-bold">必須</span>
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
                カード保存後はこのURLに固定されます。必要であれば直接修正できます。
              </p>
            </div>

            {/* タイトル (Title) */}
            <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">GPTs出力を一括反映</h2>
                  <p className="text-xs text-slate-500">
                    title、description、post を含むJSONを貼り付けると、カード文言と投稿文に反映します。
                  </p>
                </div>
              </div>
              <textarea
                value={gptsPasteText}
                onChange={(event) => {
                  setGptsPasteText(event.target.value);
                  setGptsMessage(null);
                }}
                rows={6}
                spellCheck={false}
                placeholder={'{\n  "title": "カードタイトル",\n  "description": "カード説明文",\n  "post": "X投稿本文"\n}'}
                className="block w-full resize-y rounded-xl border border-indigo-100 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleApplyGptsOutput}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-100 hover:bg-indigo-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  フォームに反映
                </button>
                {gptsMessage && (
                  <p className={`text-xs font-semibold ${gptsMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {gptsMessage.text}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-indigo-100 pt-3">
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
                  placeholder="GPTsのpostがここに入ります。必要に応じて手直しできます。"
                  className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {postText.length > 140 && (
                  <p className="text-xs font-semibold text-rose-600">
                    投稿本文が140文字を超えています。GPTs側またはこの欄で短くしてください。
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
                    投稿本文の下に、現在のスラッグから生成したカードURLを自動で追加します。
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
              <p className="text-xs text-slate-400">空欄の場合、Xカードではタイトル情報を出力しません。</p>
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
              disabled={isPending || isImageProcessing}
              className={`flex-1 inline-flex justify-center items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 ${
                isPending ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isPending
                ? 'アップロード＆保存中...'
                : isImageProcessing
                  ? '画像を加工中...'
                  : 'カードを作成して保存'}
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
              {title.trim() && (
                <div className="text-[14px] font-bold text-slate-800 leading-snug line-clamp-2">
                  {title}
                </div>
              )}

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
