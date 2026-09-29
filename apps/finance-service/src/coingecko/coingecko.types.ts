/** Ruwe antwoordvormen van de CoinGecko v3-API (enkel de velden die we gebruiken). */
export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number | null;
  last_updated: string;
}

export interface CoinGeckoMarketChart {
  /** Paren van [timestamp in ms, prijs]. */
  prices: [number, number][];
}

/** Antwoord van /simple/price: onbekende ids ontbreken gewoon in het object. */
export type CoinGeckoSimplePrices = Record<string, { usd?: number }>;

export class CoinGeckoError extends Error {
  constructor(
    readonly endpoint: string,
    /** HTTP-status van CoinGecko, of undefined bij netwerkfout/timeout. */
    readonly status: number | undefined,
    options?: { cause?: unknown },
  ) {
    super(`CoinGecko-request '${endpoint}' mislukt (status: ${status ?? 'geen antwoord'})`, options);
    this.name = 'CoinGeckoError';
  }
}
