import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Card, CardWithClickCount, ClickLog } from '@/types';

type LocalData = {
  cards: Card[];
  click_logs: ClickLog[];
};

const dataDir = path.join(process.cwd(), '.local-data');
const dbPath = path.join(dataDir, 'db.json');
const publicImageDir = path.join(process.cwd(), 'public', 'local-card-images');

export function isLocalStoreEnabled() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    !supabaseUrl ||
    !serviceKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseUrl.includes('your_supabase') ||
    supabaseUrl.includes('your-project-id') ||
    serviceKey.includes('placeholder') ||
    serviceKey.includes('your_') ||
    serviceKey.includes('your-')
  );
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(publicImageDir, { recursive: true });

  try {
    await fs.access(dbPath);
  } catch {
    await writeData({ cards: [], click_logs: [] });
  }
}

async function readData(): Promise<LocalData> {
  await ensureStore();
  const raw = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(raw) as LocalData;
}

async function writeData(data: LocalData) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function localSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function getLocalImagePath(imageUrl: string) {
  const marker = '/local-card-images/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;

  const fileName = imageUrl.substring(index + marker.length);
  return path.join(publicImageDir, fileName);
}

export async function saveLocalImage(file: File): Promise<string> {
  await ensureStore();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = path.join(publicImageDir, fileName);

  await fs.writeFile(filePath, buffer);

  return `${localSiteUrl()}/local-card-images/${fileName}`;
}

export async function deleteLocalImage(imageUrl: string) {
  const imagePath = getLocalImagePath(imageUrl);
  if (!imagePath) return;

  try {
    await fs.unlink(imagePath);
  } catch {
    // The image may already have been removed.
  }
}

export async function getLocalCards(): Promise<CardWithClickCount[]> {
  const data = await readData();

  return data.cards
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((card) => ({
      ...card,
      click_count: data.click_logs.filter((log) => log.card_id === card.id).length,
    }));
}

export async function getLocalCardById(id: string): Promise<Card | null> {
  const data = await readData();
  return data.cards.find((card) => card.id === id) || null;
}

export async function getLocalCardBySlug(slug: string): Promise<Card | null> {
  const data = await readData();
  return data.cards.find((card) => card.slug === slug) || null;
}

export async function createLocalCard(input: {
  title: string;
  description: string | null;
  slug: string;
  image_url: string;
  destination_url: string;
}): Promise<{ success: boolean; error?: string }> {
  const data = await readData();
  if (data.cards.some((card) => card.slug === input.slug)) {
    return { success: false, error: 'このスラッグは既に登録されています。重複しないスラッグを指定してください。' };
  }

  const now = new Date().toISOString();
  data.cards.push({
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    slug: input.slug,
    image_url: input.image_url,
    destination_url: input.destination_url,
    created_at: now,
    updated_at: now,
  });

  await writeData(data);
  return { success: true };
}

export async function updateLocalCard(
  id: string,
  input: {
    title: string;
    description: string | null;
    slug: string;
    image_url: string;
    destination_url: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const data = await readData();
  const index = data.cards.findIndex((card) => card.id === id);
  if (index === -1) {
    return { success: false, error: '指定されたカードが見つかりません。' };
  }

  if (data.cards.some((card) => card.id !== id && card.slug === input.slug)) {
    return { success: false, error: 'このスラッグは既に別のカードで登録されています。' };
  }

  data.cards[index] = {
    ...data.cards[index],
    ...input,
    updated_at: new Date().toISOString(),
  };

  await writeData(data);
  return { success: true };
}

export async function deleteLocalCard(id: string): Promise<{ success: boolean; error?: string }> {
  const data = await readData();
  const card = data.cards.find((item) => item.id === id);
  if (!card) {
    return { success: false, error: '削除対象のカードが見つかりません。' };
  }

  data.cards = data.cards.filter((item) => item.id !== id);
  data.click_logs = data.click_logs.filter((log) => log.card_id !== id);
  await writeData(data);
  await deleteLocalImage(card.image_url);

  return { success: true };
}

export async function getLocalDashboardStats() {
  const data = await readData();
  const recentLogs = data.click_logs
    .slice()
    .sort((a, b) => b.clicked_at.localeCompare(a.clicked_at))
    .slice(0, 5);

  return {
    totalCards: data.cards.length,
    totalClicks: data.click_logs.length,
    recentClicks: recentLogs.map((log) => {
      const card = data.cards.find((item) => item.id === log.card_id);

      return {
        id: log.id,
        cardTitle: card?.title || '削除されたカード',
        cardSlug: card?.slug || '',
        cardImageUrl: card?.image_url || null,
        userAgent: log.user_agent || 'Unknown',
        referer: log.referer || 'Direct',
        clickedAt: log.clicked_at,
      };
    }),
  };
}

export async function addLocalClickLog(input: {
  card_id: string;
  user_agent: string | null;
  referer: string | null;
  ip_hash: string | null;
}) {
  const data = await readData();
  data.click_logs.push({
    id: crypto.randomUUID(),
    card_id: input.card_id,
    user_agent: input.user_agent,
    referer: input.referer,
    ip_hash: input.ip_hash,
    clicked_at: new Date().toISOString(),
  });

  await writeData(data);
}
