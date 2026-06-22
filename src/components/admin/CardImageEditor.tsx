'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { ImagePlus, Play, Upload, ZoomIn } from 'lucide-react';
import { createCardImage, releaseCardImageSource } from '@/lib/card-image';

const CARD_ASPECT = 1200 / 628;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type CardImageEditorProps = {
  initialImageUrl?: string;
  onChange: (file: File) => void;
  onProcessingChange: (processing: boolean) => void;
};

export default function CardImageEditor({
  initialImageUrl,
  onChange,
  onProcessingChange,
}: CardImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generationRef = useRef(0);
  const sourceUrlRef = useRef<string | null>(null);
  const cropPixelsRef = useRef<Area | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState('card-image');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showPlayMark, setShowPlayMark] = useState(false);
  const [playMarkSize, setPlayMarkSize] = useState(12);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProcessingState = useCallback(
    (value: boolean) => {
      setProcessing(value);
      onProcessingChange(value);
    },
    [onProcessingChange]
  );

  const selectFile = useCallback(
    (file?: File) => {
      if (!file) return;

      generationRef.current += 1;

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setError('JPEG・PNG・WebP形式の画像を選択してください。');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('画像は15MB以下のファイルを選択してください。');
        return;
      }

      const nextSourceUrl = URL.createObjectURL(file);
      setError(null);
      setProcessingState(true);

      const probe = new Image();
      probe.onload = () => {
        if (probe.naturalWidth * probe.naturalHeight > MAX_IMAGE_PIXELS) {
          URL.revokeObjectURL(nextSourceUrl);
          setError('画像サイズが大きすぎます。4000万画素以下の画像を選択してください。');
          setProcessingState(false);
          return;
        }

        if (sourceUrlRef.current) {
          releaseCardImageSource(sourceUrlRef.current);
          URL.revokeObjectURL(sourceUrlRef.current);
        }

        sourceUrlRef.current = nextSourceUrl;
        setSourceUrl(nextSourceUrl);
        setSourceFileName(file.name);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setShowPlayMark(false);
        setPlayMarkSize(12);
        cropPixelsRef.current = null;
        setCroppedAreaPixels(null);
      };
      probe.onerror = () => {
        URL.revokeObjectURL(nextSourceUrl);
        setError('画像を読み込めませんでした。別の画像を選択してください。');
        setProcessingState(false);
      };
      probe.src = nextSourceUrl;
    },
    [setProcessingState]
  );

  const onCropComplete = useCallback(
    (_croppedArea: Area, pixels: Area) => {
      const previous = cropPixelsRef.current;
      if (
        previous &&
        previous.x === pixels.x &&
        previous.y === pixels.y &&
        previous.width === pixels.width &&
        previous.height === pixels.height
      ) {
        return;
      }

      cropPixelsRef.current = pixels;
      setProcessingState(true);
      setCroppedAreaPixels(pixels);
    },
    [setProcessingState]
  );

  useEffect(() => {
    if (!sourceUrl || !croppedAreaPixels) return;

    const generation = ++generationRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const file = await createCardImage(
          sourceUrl,
          croppedAreaPixels,
          showPlayMark,
          playMarkSize,
          sourceFileName
        );

        if (generation !== generationRef.current) return;
        onChange(file);
        setError(null);
      } catch (caughtError) {
        if (generation !== generationRef.current) return;
        setError(caughtError instanceof Error ? caughtError.message : '画像の加工に失敗しました。');
      } finally {
        if (generation === generationRef.current) {
          setProcessingState(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [croppedAreaPixels, onChange, playMarkSize, setProcessingState, showPlayMark, sourceFileName, sourceUrl]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      if (sourceUrlRef.current) {
        releaseCardImageSource(sourceUrlRef.current);
        URL.revokeObjectURL(sourceUrlRef.current);
      }
    };
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  if (!sourceUrl) {
    return (
      <div
        className={`border-2 border-dashed p-5 text-center transition-colors ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50/50'
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {initialImageUrl && (
          <div className="mx-auto mb-4 aspect-[1.91/1] max-w-sm overflow-hidden rounded-md border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={initialImageUrl} alt="現在のカード画像" className="h-full w-full object-cover" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {initialImageUrl ? <ImagePlus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {initialImageUrl ? '画像を差し替えて編集' : '画像を選択'}
        </button>
        <p className="mt-3 text-xs text-slate-500">画像をドラッグ＆ドロップすることもできます</p>
        <p className="mt-1 text-[11px] text-slate-400">JPEG・PNG・WebP、15MB以下</p>
        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      </div>
    );
  }

  const playPreviewWidth = `${playMarkSize * 1.05}%`;

  return (
    <div
      className={`space-y-4 border-2 border-dashed p-4 transition-colors ${
        dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200'
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <div className="relative aspect-[1.91/1] w-full overflow-hidden rounded-md bg-slate-900">
        <Cropper
          image={sourceUrl}
          crop={crop}
          zoom={zoom}
          aspect={CARD_ASPECT}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          minZoom={1}
          maxZoom={3}
          showGrid
          objectFit="cover"
        />
        {showPlayMark && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-sky-500/95 shadow-lg"
            style={{ width: playPreviewWidth }}
            aria-hidden="true"
          >
            <Play className="h-full w-full translate-x-[4%] fill-white p-[25%] text-white" />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5">
            <ZoomIn className="h-4 w-4 text-indigo-500" />
            画像の拡大・縮小
          </span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-indigo-600"
          />
        </label>
        <div className="space-y-2 text-xs font-bold text-slate-600">
          <label className="flex min-h-7 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPlayMark}
              onChange={(event) => {
                setProcessingState(true);
                setShowPlayMark(event.target.checked);
              }}
              className="h-4 w-4 accent-sky-500"
            />
            <Play className="h-4 w-4 fill-sky-500 text-sky-500" />
            再生マークを表示する
          </label>
          {showPlayMark && (
            <label className="block space-y-2">
              <span>再生マークの大きさ</span>
              <input
                type="range"
                min="8"
                max="18"
                step="0.5"
                value={playMarkSize}
                onChange={(event) => {
                  setProcessingState(true);
                  setPlayMarkSize(Number(event.target.value));
                }}
                className="w-full accent-sky-500"
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className={`text-xs font-semibold ${error ? 'text-rose-600' : 'text-slate-500'}`}>
          {error || (processing ? '加工済み画像を生成中...' : '1200×628pxの加工済み画像を使用します')}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <ImagePlus className="h-4 w-4" />
          別の画像を選択
        </button>
      </div>
    </div>
  );
}
