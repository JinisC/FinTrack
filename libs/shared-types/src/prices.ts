/** Actuele marktgegevens van één coin, zoals de finance-service ze aanbiedt. */
export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  priceChange24hPct: number | null;
  lastUpdated: string;
}

export interface PricePoint {
  /** Unix-timestamp in milliseconden. */
  timestamp: number;
  price: number;
}

export interface CoinHistory {
  id: string;
  days: number;
  prices: PricePoint[];
}

/** Metadata die aangeeft of data vers is of uit de stale-fallback komt. */
export interface PriceResponse<T> {
  data: T;
  stale: boolean;
  fetchedAt: string;
}
