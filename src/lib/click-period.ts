export const CLICK_PERIOD_OPTIONS = [
  { value: '24h', label: '直近24時間' },
  { value: '48h', label: '直近48時間' },
  { value: '72h', label: '直近72時間' },
  { value: '7d', label: '直近7日' },
  { value: '30d', label: '直近30日' },
  { value: 'all', label: '全期間' },
] as const;

export type ClickPeriod = (typeof CLICK_PERIOD_OPTIONS)[number]['value'];

export type ClickPeriodRange = {
  start: string | null;
  end: string | null;
};

const PERIOD_DURATION_MS: Record<Exclude<ClickPeriod, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function parseClickPeriod(value: string | string[] | undefined): ClickPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return CLICK_PERIOD_OPTIONS.some((option) => option.value === candidate)
    ? (candidate as ClickPeriod)
    : 'all';
}

export function getClickPeriodRange(
  period: ClickPeriod,
  now: Date = new Date()
): ClickPeriodRange {
  const endTime = now.getTime();
  if (!Number.isFinite(endTime)) {
    throw new Error('集計基準日時が不正です。');
  }

  if (period === 'all') {
    return { start: null, end: null };
  }

  return {
    start: new Date(endTime - PERIOD_DURATION_MS[period]).toISOString(),
    end: new Date(endTime).toISOString(),
  };
}

export function isClickInPeriod(clickedAt: string, range: ClickPeriodRange): boolean {
  const timestamp = Date.parse(clickedAt);
  if (!Number.isFinite(timestamp)) return false;

  const start = range.start ? Date.parse(range.start) : null;
  const end = range.end ? Date.parse(range.end) : null;
  return (start === null || timestamp >= start) && (end === null || timestamp < end);
}
