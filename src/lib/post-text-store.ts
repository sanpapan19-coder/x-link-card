const POST_TEXT_STORAGE_PREFIX = 'post-tool:card-post:';

function getStorageKey(slug: string) {
  return `${POST_TEXT_STORAGE_PREFIX}${slug}`;
}

export function getStoredPostText(slug: string): string {
  if (typeof window === 'undefined' || !slug) return '';
  return window.localStorage.getItem(getStorageKey(slug)) || '';
}

export function setStoredPostText(slug: string, postText: string) {
  if (typeof window === 'undefined' || !slug) return;

  const trimmed = postText.trim();
  if (trimmed) {
    window.localStorage.setItem(getStorageKey(slug), trimmed);
  } else {
    window.localStorage.removeItem(getStorageKey(slug));
  }
}

export function moveStoredPostText(previousSlug: string, nextSlug: string, postText: string) {
  if (typeof window === 'undefined') return;

  if (previousSlug && previousSlug !== nextSlug) {
    window.localStorage.removeItem(getStorageKey(previousSlug));
  }

  setStoredPostText(nextSlug, postText);
}

export function buildXPostText(postText: string, slug: string, origin: string) {
  const cardUrl = slug.trim() ? `${origin.replace(/\/$/, '')}/x/${slug.trim()}` : '';
  return [postText.trim(), cardUrl].filter(Boolean).join('\n\n');
}
