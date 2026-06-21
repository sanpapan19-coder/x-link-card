'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardWithClickCount } from '@/types';
import {
  createLocalCard,
  deleteLocalCard,
  deleteLocalImage,
  getLocalCardById,
  getLocalCards,
  getLocalDashboardStats,
  isLocalStoreEnabled,
  saveLocalImage,
  updateLocalCard,
} from '@/lib/local-store';

type RecentClickLog = {
  id: string;
  user_agent: string | null;
  referer: string | null;
  clicked_at: string;
  cards: RelatedCard | RelatedCard[] | null;
};

type RelatedCard = {
  title: string | null;
  slug: string | null;
  image_url: string | null;
};

const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function validateImageFile(file: File): string | null {
  if (!IMAGE_EXTENSIONS[file.type]) {
    return '画像はJPEG・PNG・WebP形式のファイルを選択してください。';
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return '画像は15MB以下のファイルを選択してください。';
  }

  return null;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '予期せぬエラーが発生しました。';
}

function getRelatedCard(cards: RecentClickLog['cards']): RelatedCard | null {
  return Array.isArray(cards) ? cards[0] || null : cards;
}

// URLバリデーション (http/httpsのみ、javascript:やdata:の排除)
function isValidDestinationUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  
  // javascript: や data: を明示的に排除
  const lowerUrl = urlStr.toLowerCase().trim();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
    return false;
  }

  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// スラッグバリデーション (英数字、ハイフン、アンダースコアのみ)
function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-zA-Z0-9-_]+$/;
  return slugRegex.test(slug);
}

/**
 * 画像を Supabase Storage にアップロードする内部関数
 */
async function uploadImage(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('画像ファイルが無効です。');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const fileExt = IMAGE_EXTENSIONS[file.type];
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `images/${fileName}`;

  // Supabase Storage にアップロード
  const { error } = await supabaseAdmin.storage
    .from('card-images')
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }

  // 公開URLを取得
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('card-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * 画像URLからStorage上のファイルパスを抽出して削除する内部関数
 */
async function deleteImageFromStorage(imageUrl: string) {
  try {
    // 例: https://.../storage/v1/object/public/card-images/images/uuid.png
    // バケット名 'card-images' の後ろのパスを抽出する
    const marker = '/card-images/';
    const index = imageUrl.indexOf(marker);
    if (index !== -1) {
      const filePath = imageUrl.substring(index + marker.length);
      const { error } = await supabaseAdmin.storage
        .from('card-images')
        .remove([filePath]);
      if (error) {
        console.error('Failed to delete image from storage:', error);
      }
    }
  } catch (err) {
    console.error('Error in deleteImageFromStorage:', err);
  }
}

/**
 * 全てのカードを取得 (クリック数付き)
 */
export async function getCards(): Promise<CardWithClickCount[]> {
  if (isLocalStoreEnabled()) {
    return getLocalCards();
  }

  // RLSを回避して admin クライアントで取得
  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (cardsError) {
    console.error('Error fetching cards:', cardsError);
    return [];
  }

  // click_logsのカウントを並列で取得（または単一クエリで集計）
  // 簡易的にカード毎に件数カウントを取得
  const { data: clickCounts, error: countError } = await supabaseAdmin
    .from('click_logs')
    .select('card_id');

  if (countError) {
    console.error('Error fetching click counts:', countError);
    return cards.map(c => ({ ...c, click_count: 0 }));
  }

  const countsMap = (clickCounts || []).reduce((acc: Record<string, number>, log) => {
    acc[log.card_id] = (acc[log.card_id] || 0) + 1;
    return acc;
  }, {});

  return cards.map(card => ({
    ...card,
    click_count: countsMap[card.id] || 0
  }));
}

/**
 * IDによるカード取得
 */
export async function getCardById(id: string): Promise<Card | null> {
  if (isLocalStoreEnabled()) {
    return getLocalCardById(id);
  }

  const { data, error } = await supabaseAdmin
    .from('cards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching card by ID:', error);
    return null;
  }
  return data;
}

/**
 * ダッシュボード用のスタッツを取得
 */
export async function getDashboardStats() {
  if (isLocalStoreEnabled()) {
    return getLocalDashboardStats();
  }

  const { count: totalCards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('*', { count: 'exact', head: true });

  const { count: totalClicks, error: clicksError } = await supabaseAdmin
    .from('click_logs')
    .select('*', { count: 'exact', head: true });

  // 直近5件のクリックログを取得し、カード情報と結合
  const { data: recentLogs, error: logsError } = await supabaseAdmin
    .from('click_logs')
    .select(`
      id,
      card_id,
      user_agent,
      referer,
      clicked_at,
      cards (
        title,
        slug,
        image_url
      )
    `)
    .order('clicked_at', { ascending: false })
    .limit(15);

  if (cardsError || clicksError || logsError) {
    console.error('Error fetching dashboard stats:', { cardsError, clicksError, logsError });
  }

  return {
    totalCards: totalCards || 0,
    totalClicks: totalClicks || 0,
    recentClicks: ((recentLogs || []) as RecentClickLog[]).map((log) => {
      const card = getRelatedCard(log.cards);

      return {
        id: log.id,
        cardTitle: card?.title || '削除されたカード',
        cardSlug: card?.slug || '',
        cardImageUrl: card?.image_url || null,
        userAgent: log.user_agent || 'Unknown',
        referer: log.referer || 'Direct',
        clickedAt: log.clicked_at
      };
    })
  };
}

/**
 * 新規カード作成アクション
 */
export async function createCardAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const slug = (formData.get('slug') as string)?.trim();
    const destinationUrl = (formData.get('destination_url') as string)?.trim();
    const imageFile = formData.get('image') as File;

    // バリデーション
    if (!slug) return { success: false, error: 'スラッグは必須です。' };
    if (!isValidSlug(slug)) {
      return { success: false, error: 'スラッグは英数字、ハイフン、アンダースコアのみ使用できます。' };
    }
    if (!destinationUrl) return { success: false, error: '遷移先URLは必須です。' };
    if (!isValidDestinationUrl(destinationUrl)) {
      return { success: false, error: '遷移先URLは http:// または https:// で始まる有効なURLである必要があります。' };
    }
    if (!imageFile || imageFile.size === 0) {
      return { success: false, error: '画像は必須です。' };
    }
    const imageValidationError = validateImageFile(imageFile);
    if (imageValidationError) {
      return { success: false, error: imageValidationError };
    }

    if (!isLocalStoreEnabled()) {
      // スラッグの重複チェック
      const { data: existingSlugCard } = await supabaseAdmin
        .from('cards')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingSlugCard) {
        return { success: false, error: 'このスラッグは既に登録されています。重複しないスラッグを指定してください。' };
      }
    }

    // 画像アップロード
    const imageUrl = isLocalStoreEnabled() ? await saveLocalImage(imageFile) : await uploadImage(imageFile);

    if (isLocalStoreEnabled()) {
      const result = await createLocalCard({
        title: title.trim(),
        description: description || null,
        slug,
        image_url: imageUrl,
        destination_url: destinationUrl
      });

      if (!result.success) {
        await deleteLocalImage(imageUrl);
        return result;
      }

      revalidatePath('/admin');
      revalidatePath('/admin/cards');
      updateTag('redirect-cards');
      return { success: true };
    }

    // データベース登録
    const { error: insertError } = await supabaseAdmin
      .from('cards')
      .insert({
        title: title.trim(),
        description: description || null,
        slug,
        image_url: imageUrl,
        destination_url: destinationUrl
      });

    if (insertError) {
      // 登録失敗時はアップロードした画像を削除してロールバックの挙動に近づける
      await deleteImageFromStorage(imageUrl);
      console.error('DB insert error:', insertError);
      return { success: false, error: `データベースへの保存に失敗しました: ${insertError.message}` };
    }

    revalidatePath('/admin');
    revalidatePath('/admin/cards');
    updateTag('redirect-cards');
    return { success: true };
  } catch (err: unknown) {
    console.error('Create action system error:', err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * カード編集アクション
 */
export async function updateCardAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const slug = (formData.get('slug') as string)?.trim();
    const destinationUrl = (formData.get('destination_url') as string)?.trim();
    const imageFile = formData.get('image') as File; // 新しい画像（任意）

    // 既存カードの取得
    const existingCard = await getCardById(id);
    if (!existingCard) {
      return { success: false, error: '指定されたカードが見つかりません。' };
    }

    // バリデーション
    if (!slug) return { success: false, error: 'スラッグは必須です。' };
    if (!isValidSlug(slug)) {
      return { success: false, error: 'スラッグは英数字、ハイフン、アンダースコアのみ使用できます。' };
    }
    if (!destinationUrl) return { success: false, error: '遷移先URLは必須です。' };
    if (!isValidDestinationUrl(destinationUrl)) {
      return { success: false, error: '遷移先URLは http:// または https:// で始まる有効なURLである必要があります。' };
    }

    // スラッグ変更時の重複チェック
    if (!isLocalStoreEnabled() && slug !== existingCard.slug) {
      const { data: existingSlugCard } = await supabaseAdmin
        .from('cards')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingSlugCard) {
        return { success: false, error: 'このスラッグは既に別のカードで登録されています。' };
      }
    }

    let imageUrl = existingCard.image_url;
    let oldImageUrlToDelete: string | null = null;

    // 画像が差し替えられた場合
    if (imageFile && imageFile.size > 0) {
      const imageValidationError = validateImageFile(imageFile);
      if (imageValidationError) {
        return { success: false, error: imageValidationError };
      }
      oldImageUrlToDelete = existingCard.image_url;
      imageUrl = isLocalStoreEnabled() ? await saveLocalImage(imageFile) : await uploadImage(imageFile);
    }

    if (isLocalStoreEnabled()) {
      const result = await updateLocalCard(id, {
        title: title.trim(),
        description: description || null,
        slug,
        image_url: imageUrl,
        destination_url: destinationUrl
      });

      if (!result.success) {
        if (imageUrl !== existingCard.image_url) {
          await deleteLocalImage(imageUrl);
        }
        return result;
      }

      if (oldImageUrlToDelete) {
        await deleteLocalImage(oldImageUrlToDelete);
      }

      revalidatePath('/admin');
      revalidatePath('/admin/cards');
      revalidatePath(`/admin/cards/${id}/edit`);
      revalidatePath(`/x/${slug}`);
      revalidatePath(`/x/${existingCard.slug}`);
      updateTag('redirect-cards');
      return { success: true };
    }

    // データベース更新
    const { error: updateError } = await supabaseAdmin
      .from('cards')
      .update({
        title: title.trim(),
        description: description || null,
        slug,
        image_url: imageUrl,
        destination_url: destinationUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      // 失敗時、新しくアップロードした画像を削除
      if (imageUrl !== existingCard.image_url) {
        await deleteImageFromStorage(imageUrl);
      }
      console.error('DB update error:', updateError);
      return { success: false, error: `データベースの更新に失敗しました: ${updateError.message}` };
    }

    // 成功した場合、古い画像をストレージから削除
    if (oldImageUrlToDelete) {
      await deleteImageFromStorage(oldImageUrlToDelete);
    }

    revalidatePath('/admin');
    revalidatePath('/admin/cards');
    revalidatePath(`/admin/cards/${id}/edit`);
    revalidatePath(`/x/${slug}`);
    revalidatePath(`/x/${existingCard.slug}`);
    updateTag('redirect-cards');
    return { success: true };
  } catch (err: unknown) {
    console.error('Update action system error:', err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * カード削除アクション
 */
export async function deleteCardAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (isLocalStoreEnabled()) {
      const result = await deleteLocalCard(id);
      revalidatePath('/admin');
      revalidatePath('/admin/cards');
      updateTag('redirect-cards');
      return result;
    }

    const card = await getCardById(id);
    if (!card) {
      return { success: false, error: '削除対象のカードが見つかりません。' };
    }

    // データベースから削除 (ON DELETE CASCADEによりclick_logsも連動して消えます)
    const { error: deleteError } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('DB delete error:', deleteError);
      return { success: false, error: `データベースからの削除に失敗しました: ${deleteError.message}` };
    }

    // ストレージから画像を削除
    await deleteImageFromStorage(card.image_url);

    revalidatePath('/admin');
    revalidatePath('/admin/cards');
    revalidatePath(`/x/${card.slug}`);
    updateTag('redirect-cards');
    return { success: true };
  } catch (err: unknown) {
    console.error('Delete action system error:', err);
    return { success: false, error: getErrorMessage(err) };
  }
}
