export type RiskAppetite = "Defensive" | "Balanced" | "Aggressive";

export interface InvestorPreferences {
  firmName: string;
  ticketSizeUsd: number;
  riskAppetite: RiskAppetite;
  preferredSectors: string[];
}

export interface PortfolioEntry {
  id: number;
  name: string;
  stage: string;
  sector: string;
  amount: number;
  note: string;
  type: "saved" | "pending" | "active";
}

export interface PortfolioState {
  saved: PortfolioEntry[];
  pending: PortfolioEntry[];
  active: PortfolioEntry[];
}

const PREFERENCES_KEY = "strike-investor-preferences";
const PORTFOLIO_KEY = "strike-investor-portfolio";

const defaultPreferences: InvestorPreferences = {
  firmName: "Northwind Ventures",
  ticketSizeUsd: 250_000,
  riskAppetite: "Balanced",
  preferredSectors: ["AI", "Cyber"],
};

const defaultPortfolioState: PortfolioState = {
  saved: [],
  pending: [],
  active: [],
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadInvestorPreferences(): InvestorPreferences {
  return readStorage<InvestorPreferences>(PREFERENCES_KEY, defaultPreferences);
}

export function saveInvestorPreferences(preferences: InvestorPreferences) {
  writeStorage(PREFERENCES_KEY, preferences);
}

export function loadPortfolioState(): PortfolioState {
  return readStorage<PortfolioState>(PORTFOLIO_KEY, defaultPortfolioState);
}

export function savePortfolioState(state: PortfolioState) {
  writeStorage(PORTFOLIO_KEY, state);
}

export function formatTicketSize(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toLocaleString()}`;
}
