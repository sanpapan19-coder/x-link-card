import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getClientIp, recordClickBySlug } from '@/lib/click-tracking';

export const preferredRegion = 'hnd1';

type ClickRequest = {
  slug?: unknown;
  referer?: unknown;
};

export async function POST(request: Request) {
  let body: ClickRequest;

  try {
    body = (await request.json()) as ClickRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.slug !== 'string') {
    return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 });
  }

  const result = await recordClickBySlug({
    slug: body.slug,
    userAgent: request.headers.get('user-agent'),
    referer: body.referer as string | null,
    ipAddress: getClientIp(request.headers),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  try {
    revalidatePath('/admin');
    revalidatePath('/admin/cards');
  } catch (error) {
    console.error('Failed to revalidate click count pages:', error);
  }

  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  });
}
