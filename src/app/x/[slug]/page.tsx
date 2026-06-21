import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import RedirectExperience from '@/components/redirect/RedirectExperience';
import { getLocalCardBySlug, isLocalStoreEnabled } from '@/lib/local-store';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Card } from '@/types';

export const revalidate = 300;
export const preferredRegion = 'hnd1';

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

const getProductionCardBySlug = unstable_cache(async (slug: string): Promise<Card | null> => {
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
}, ['redirect-card-by-slug'], { revalidate: 300, tags: ['redirect-cards'] });

const getCardBySlug = cache(async (slug: string): Promise<Card | null> => {
  if (isLocalStoreEnabled()) {
    return getLocalCardBySlug(slug);
  }

  return getProductionCardBySlug(slug);
});

function getMetadataTitle(card: Card): string {
  const title = card.title.trim();
  if (title) return title;

  try {
    const host = new URL(card.destination_url).hostname.replace(/^www\./, '');
    return `${host} のリンク`;
  } catch {
    return 'リンク先を開く';
  }
}

export async function generateMetadata({ params }: RedirectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardBySlug(slug);

  if (!card) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pageUrl = `${siteUrl.replace(/\/$/, '')}/x/${card.slug}`;
  const title = getMetadataTitle(card);
  const description = card.description?.trim() || undefined;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      title,
      description,
      images: [{ url: card.image_url, alt: title, width: 1200, height: 628 }],
      url: pageUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: card.image_url, alt: title, width: 1200, height: 628 }],
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
      title={getMetadataTitle(card)}
      imageUrl={card.image_url}
      destinationUrl={card.destination_url}
    />
  );
}
