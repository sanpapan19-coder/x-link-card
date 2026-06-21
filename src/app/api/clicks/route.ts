import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { addLocalClickLog, getLocalCardBySlug, isLocalStoreEnabled } from '@/lib/local-store';
import { supabaseAdmin } from '@/lib/supabase-admin';

const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_REFERER_LENGTH = 2048;

type ClickRequest = {
  slug?: unknown;
  referer?: unknown;
};

function getIpHash(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const rawIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';

  if (!rawIp) return null;

  const hashSecret =
    process.env.CLICK_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'local-development-click-hash';

  return crypto.createHmac('sha256', hashSecret).update(rawIp).digest('hex');
}

function normalizeReferer(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const referer = value.trim();
  if (!referer) return null;

  try {
    const url = new URL(referer);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return referer.slice(0, MAX_REFERER_LENGTH);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: ClickRequest;

  try {
    body = (await request.json()) as ClickRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.slug !== 'string' || !SLUG_PATTERN.test(body.slug)) {
    return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 });
  }

  const localMode = isLocalStoreEnabled();
  let card: { id: string } | null;

  if (localMode) {
    card = await getLocalCardBySlug(body.slug);
  } else {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch card for click:', error);
      return NextResponse.json({ error: 'Failed to find card.' }, { status: 500 });
    }

    card = data;
  }

  if (!card) {
    return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
  }

  const click = {
    card_id: card.id,
    user_agent: request.headers.get('user-agent')?.slice(0, 1024) || null,
    referer: normalizeReferer(body.referer),
    ip_hash: getIpHash(request),
  };

  try {
    if (localMode) {
      await addLocalClickLog(click);
    } else {
      const { error } = await supabaseAdmin.from('click_logs').insert(click);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Failed to save click log:', error);
    return NextResponse.json({ error: 'Failed to save click.' }, { status: 500 });
  }

  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  });
}
