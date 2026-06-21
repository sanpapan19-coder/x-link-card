import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import RedirectExperience from '@/components/redirect/RedirectExperience';
import { getLocalCardBySlug, isLocalStoreEnabled } from '@/lib/local-store';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Card } from '@/types';

export const dynamic = 'force-dynamic';

interface RedirectPageProps {
  params: Promise<{ slug: string }>;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const getCardBySlug = cache(async (slug: string): Promise<Card | null> => {
  if (isLocalStoreEnabled()) {
    return getLocalCardBySlug(slug);
  }

  const { data, error } = await supabaseAdmin
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch redirect card:', error);
    return null;
  }

  return data;
});

export async function generateMetadata({ params }: RedirectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardBySlug(slug);

  if (!card) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pageUrl = `${siteUrl.replace(/\/$/, '')}/x/${card.slug}`;
  const title = card.title.trim() || undefined;
  const description = card.description || undefined;
  const imageAlt = title || 'カード画像';

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      title,
      description,
      images: [{ url: card.image_url, alt: imageAlt }],
      url: pageUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: card.image_url, alt: imageAlt }],
    },
  };
}

export default async function RedirectPage({ params }: RedirectPageProps) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);

  if (!card) {
    notFound();
  }

  if (!isSafeHttpUrl(card.image_url) || !isSafeHttpUrl(card.destination_url)) {
    console.error(`Unsafe URL detected for card ${card.id}`);
    notFound();
  }

  return (
    <RedirectExperience
      slug={card.slug}
      title={card.title || 'カード画像'}
      imageUrl={card.image_url}
      destinationUrl={card.destination_url}
    />
  );
}
