/** Eén aankoop ("lot") in de portfolio. Bedragen in USD. */
export interface PortfolioEntry {
  id: string;
  /** CoinGecko-id, bv. "bitcoin". */
  coinId: string;
  amount: number;
  buyPriceUsd: number;
  boughtAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Entry aangevuld met de actuele waarde. `null` als er geen actuele prijs beschikbaar is. */
export interface PortfolioPosition extends PortfolioEntry {
  costUsd: number;
  currentPriceUsd: number | null;
  valueUsd: number | null;
  pnlUsd: number | null;
  pnlPct: number | null;
}

/** Totalen over alle entries waarvoor een actuele prijs bekend is. */
export interface PortfolioTotals {
  costUsd: number;
  valueUsd: number;
  pnlUsd: number;
  pnlPct: number | null;
  /** Aantal entries zonder actuele prijs (niet meegeteld in de totalen). */
  unpricedEntries: number;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  totals: PortfolioTotals;
  /** true als de prijzen verouderd zijn of (deels) ontbreken door een CoinGecko-storing. */
  stale: boolean;
  pricesFetchedAt: string | null;
}

export interface CreatePortfolioEntryRequest {
  coinId: string;
  amount: number;
  buyPriceUsd: number;
  boughtAt: string;
  note?: string;
}

export type UpdatePortfolioEntryRequest = Partial<CreatePortfolioEntryRequest>;
