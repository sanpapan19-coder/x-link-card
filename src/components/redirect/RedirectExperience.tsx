'use client';

import { useCallback, useEffect, useRef } from 'react';

const REDIRECT_DELAY_MS = 400;

type RedirectExperienceProps = {
  slug: string;
  title: string;
  imageUrl: string;
  destinationUrl: string;
};

export default function RedirectExperience({
  slug,
  title,
  imageUrl,
  destinationUrl,
}: RedirectExperienceProps) {
  const logStartedRef = useRef(false);
  const navigationStartedRef = useRef(false);

  const recordClick = useCallback(() => {
    if (logStartedRef.current) return;
    logStartedRef.current = true;

    void fetch('/api/clicks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        referer: document.referrer || null,
      }),
      keepalive: true,
      cache: 'no-store',
    }).catch((error) => {
      console.error('Failed to record click:', error);
    });
  }, [slug]);

  const navigate = useCallback(() => {
    if (navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    recordClick();
    window.location.replace(destinationUrl);
  }, [destinationUrl, recordClick]);

  useEffect(() => {
    recordClick();
    const timer = window.setTimeout(navigate, REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [navigate, recordClick]);

  return (
    <main className="min-h-dvh bg-white px-4 py-5 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-2xl flex-col rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:min-h-[calc(100dvh-4rem)] sm:p-5">
        <div className="aspect-[1.91/1] w-full overflow-hidden rounded-md bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-8" aria-live="polite">
          <span
            className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-sky-500"
            role="status"
            aria-label="読み込み中"
          />
        </div>

        <a
          href={destinationUrl}
          onClick={(event) => {
            event.preventDefault();
            navigate();
          }}
          className="flex min-h-14 w-full items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-4 py-3 text-center text-base font-bold text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          自動で移動しない場合はこちら
        </a>
      </section>
    </main>
  );
}
