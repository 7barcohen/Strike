import { createClient } from "@supabase/supabase-js";
import type { LiveCompanyAnalysis, ProvenanceSource, ValuationScenario } from "@/lib/ai-underwriter";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const strikeSchemaSql = `
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sector text not null,
  sub_industry text,
  funding_stage text,
  fmv numeric not null default 0,
  p_exit numeric not null default 0,
  institutional_risk_score numeric not null default 0,
  exit_scenarios jsonb not null default '[]'::jsonb,
  logo_url text,
  one_liner text,
  ai_sources jsonb not null default '[]'::jsonb,
  legal_profile jsonb not null default '{}'::jsonb,
  risk_rating text,
  confidence numeric not null default 0,
  source text default 'live',
  updated_at timestamptz not null default now()
);

create table if not exists public.option_grants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  employee_alias text not null,
  option_count numeric not null default 0,
  strike_price numeric not null default 0,
  exercise_cost numeric not null default 0,
  tax_route text not null default 'Section 102',
  status text not null default 'pending_underwriting' check (status in ('pending_underwriting', 'approved', 'live', 'matched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.option_grants(id) on delete cascade,
  investor_firm text not null,
  committed_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'settled')),
  signed_loi boolean not null default false,
  signature_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_sector_idx on public.companies (sector);
create index if not exists option_grants_status_idx on public.option_grants (status);
create index if not exists allocations_status_idx on public.allocations (status);

alter table public.companies enable row level security;
alter table public.option_grants enable row level security;
alter table public.allocations enable row level security;
`;

export type GrantStatus = "pending_underwriting" | "approved" | "live" | "matched";
export type AllocationStatus = "pending" | "approved" | "settled";

export interface CompanyRecord {
  id: string;
  name: string;
  sector: string;
  sub_industry: string | null;
  funding_stage: string | null;
  fmv: number;
  p_exit: number;
  institutional_risk_score: number;
  exit_scenarios: ValuationScenario[];
  logo_url: string | null;
  one_liner: string | null;
  ai_sources: ProvenanceSource[];
  legal_profile: LiveCompanyAnalysis["legalProfile"] | Record<string, never>;
  risk_rating: string | null;
  confidence: number;
  source: string | null;
  updated_at?: string;
}

export interface OptionGrantRecord {
  id: string;
  company_id: string | null;
  company_name: string;
  employee_alias: string;
  option_count: number;
  strike_price: number;
  exercise_cost: number;
  tax_route: string;
  status: GrantStatus;
  created_at?: string;
  updated_at?: string;
}

export interface AllocationRecord {
  id: string;
  grant_id: string;
  investor_firm: string;
  committed_amount: number;
  status: AllocationStatus;
  signed_loi: boolean;
  signature_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyProfileInput {
  company_name: string;
  sector: string;
  sub_industry?: string;
  funding_stage?: string;
  fmv: number;
  p_exit: number;
  institutional_risk_score: number;
  exit_scenarios: ValuationScenario[];
  logo_url: string;
  one_liner: string;
  ai_sources: ProvenanceSource[];
  legal_profile: LiveCompanyAnalysis["legalProfile"];
  risk_rating?: string;
  confidence?: number;
  source?: string;
}

export interface OptionGrantInput {
  company_name: string;
  employee_alias?: string;
  option_count?: number;
  options_count?: number;
  strike_price?: number;
  exercise_cost?: number;
  estimated_fmv?: number;
  liquidity_pool_usd?: number;
  tax_route?: string;
  status?: GrantStatus;
  company_id?: string;
}

export interface AllocationInput {
  grant_id: string;
  investor_firm: string;
  committed_amount: number;
  status?: AllocationStatus;
  signed_loi?: boolean;
  signature_name?: string;
}

function normalizeCompanyPayload(payload: CompanyProfileInput) {
  return {
    name: payload.company_name,
    sector: payload.sector,
    sub_industry: payload.sub_industry ?? null,
    funding_stage: payload.funding_stage ?? null,
    fmv: payload.fmv,
    p_exit: payload.p_exit,
    institutional_risk_score: payload.institutional_risk_score,
    exit_scenarios: payload.exit_scenarios,
    logo_url: payload.logo_url,
    one_liner: payload.one_liner,
    ai_sources: payload.ai_sources,
    legal_profile: payload.legal_profile,
    risk_rating: payload.risk_rating ?? null,
    confidence: payload.confidence ?? 0,
    source: payload.source ?? "live",
    updated_at: new Date().toISOString(),
  };
}

function normalizeGrantPayload(payload: OptionGrantInput) {
  const optionCount = payload.option_count ?? payload.options_count ?? 0;
  const strikePrice = payload.strike_price ?? 0;
  const exerciseCost = payload.exercise_cost ?? optionCount * strikePrice;

  return {
    company_id: payload.company_id ?? null,
    company_name: payload.company_name,
    employee_alias: payload.employee_alias ?? "Anonymous Holder",
    option_count: optionCount,
    strike_price: strikePrice,
    exercise_cost: exerciseCost,
    tax_route: payload.tax_route ?? "Section 102",
    status: payload.status ?? "pending_underwriting",
    updated_at: new Date().toISOString(),
  };
}

function normalizeAllocationPayload(payload: AllocationInput) {
  return {
    grant_id: payload.grant_id,
    investor_firm: payload.investor_firm,
    committed_amount: payload.committed_amount,
    status: payload.status ?? "pending",
    signed_loi: payload.signed_loi ?? false,
    signature_name: payload.signature_name ?? "",
    updated_at: new Date().toISOString(),
  };
}

export async function upsertCompanyProfile(payload: CompanyProfileInput) {
  if (!supabase) return null;

  const { data, error } = await supabase.from("companies").upsert(normalizeCompanyPayload(payload), {
    onConflict: "name",
  }).select().single();

  if (error) {
    console.error("Supabase company upsert failed", error);
    return null;
  }

  return data;
}

export async function insertOptionGrant(payload: OptionGrantInput) {
  if (!supabase) return null;

  const { data, error } = await supabase.from("option_grants").insert(normalizeGrantPayload(payload)).select().single();

  if (error) {
    console.error("Supabase grant insert failed", error);
    return null;
  }

  return data;
}

export async function insertAllocation(payload: AllocationInput) {
  if (!supabase) return null;

  const { data, error } = await supabase.from("allocations").insert(normalizeAllocationPayload(payload)).select().single();

  if (error) {
    console.error("Supabase allocation insert failed", error);
    return null;
  }

  return data;
}

export async function updateGrantStatus(grantId: string, status: GrantStatus) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("option_grants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", grantId)
    .select()
    .single();

  if (error) {
    console.error("Supabase grant status update failed", error);
    return null;
  }

  return data;
}

export async function updateAllocationStatus(allocationId: string, status: AllocationStatus) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("allocations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", allocationId)
    .select()
    .single();

  if (error) {
    console.error("Supabase allocation status update failed", error);
    return null;
  }

  return data;
}

export async function fetchCompanies() {
  if (!supabase) return [] as CompanyRecord[];

  const { data, error } = await supabase.from("companies").select("*").order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase company fetch failed", error);
    return [] as CompanyRecord[];
  }

  return (data || []) as CompanyRecord[];
}

export async function fetchOptionGrants() {
  if (!supabase) return [] as OptionGrantRecord[];

  const { data, error } = await supabase.from("option_grants").select("*").order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase grant fetch failed", error);
    return [] as OptionGrantRecord[];
  }

  return (data || []) as OptionGrantRecord[];
}

export async function fetchAllocations() {
  if (!supabase) return [] as AllocationRecord[];

  const { data, error } = await supabase.from("allocations").select("*").order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase allocation fetch failed", error);
    return [] as AllocationRecord[];
  }

  return (data || []) as AllocationRecord[];
}

export type StrikeRealtimeEvent =
  | { table: "companies"; eventType: string; record: CompanyRecord }
  | { table: "option_grants"; eventType: string; record: OptionGrantRecord }
  | { table: "allocations"; eventType: string; record: AllocationRecord };

export function subscribeToStrikeFeed(onEvent: (event: StrikeRealtimeEvent) => void) {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("strike-live-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, (payload) => {
      onEvent({ table: "companies", eventType: payload.eventType, record: payload.new as CompanyRecord });
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "option_grants" }, (payload) => {
      onEvent({ table: "option_grants", eventType: payload.eventType, record: payload.new as OptionGrantRecord });
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "allocations" }, (payload) => {
      onEvent({ table: "allocations", eventType: payload.eventType, record: payload.new as AllocationRecord });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
