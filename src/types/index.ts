export interface Card {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  image_url: string;
  destination_url: string;
  created_at: string;
  updated_at: string;
}

export interface ClickLog {
  id: string;
  card_id: string;
  user_agent: string | null;
  referer: string | null;
  ip_hash: string | null;
  clicked_at: string;
}

export interface CardWithClickCount extends Card {
  click_count: number;
}
