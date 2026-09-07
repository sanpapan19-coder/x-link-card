import crypto from 'crypto';
import { addLocalClickLog, getLocalCardBySlug, isLocalStoreEnabled } from '@/lib/local-store';
import { supabaseAdmin } from '@/lib/supabase-admin';

const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_REFERER_LENGTH = 2048;

type RecordClickInput = {
  slug: string;
  userAgent: string | null;
  referer: string | null;
  ipAddress: string | null;
};

export type RecordClickResult =
  | { ok: true }
  | { ok: false; status: 400 | 404 | 500; message: string };

export function isValidClickSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}

export function normalizeClickReferer(value: unknown): string | null {
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

export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || headers.get('x-real-ip') || null;
}

export function getIpHash(ipAddress: string | null): string | null {
  if (!ipAddress) return null;

  const hashSecret =
    process.env.CLICK_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'local-development-click-hash';

  return crypto.createHmac('sha256', hashSecret).update(ipAddress).digest('hex');
}

export function isLikelyCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;

  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|line-poker/i.test(
    userAgent
  );
}

export function shouldRecordCardOpen(headers: Headers): boolean {
  if (headers.get('x-card-request-method') !== 'GET') return false;
  if (isLikelyCrawler(headers.get('user-agent'))) return false;
  if (headers.has('next-router-prefetch') || headers.has('next-router-segment-prefetch')) return false;
  return !/prefetch|prerender/i.test(
    `${headers.get('purpose') || ''} ${headers.get('sec-purpose') || ''}`
  );
}

export async function recordClickBySlug(input: RecordClickInput): Promise<RecordClickResult> {
  if (!isValidClickSlug(input.slug)) {
    return { ok: false, status: 400, message: 'Invalid slug.' };
  }

  const localMode = isLocalStoreEnabled();
  let card: { id: string } | null;

  if (localMode) {
    card = await getLocalCardBySlug(input.slug);
  } else {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('slug', input.slug)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch card for click:', error);
      return { ok: false, status: 500, message: 'Failed to find card.' };
    }

    card = data;
  }

  if (!card) {
    return { ok: false, status: 404, message: 'Card not found.' };
  }

  const click = {
    card_id: card.id,
    user_agent: input.userAgent?.slice(0, 1024) || null,
    referer: normalizeClickReferer(input.referer),
    ip_hash: getIpHash(input.ipAddress),
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
    return { ok: false, status: 500, message: 'Failed to save click.' };
  }

  return { ok: true };
}
