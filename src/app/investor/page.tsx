"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildAutonomousUnderwritingReport, evaluateStartup, type LiveCompanyAnalysis } from "@/lib/ai-underwriter";
import { formatTicketSize, loadInvestorPreferences, loadPortfolioState, saveInvestorPreferences, savePortfolioState, type PortfolioEntry, type PortfolioState, type RiskAppetite } from "@/lib/investor-storage";
import AgreementPreviewModal from "@/components/agreement-preview-modal";
import {
  fetchAllocations,
  fetchCompanies,
  fetchOptionGrants,
  insertAllocation,
  subscribeToStrikeFeed,
  updateGrantStatus,
  type AllocationRecord,
  type CompanyRecord,
  type OptionGrantRecord,
} from "@/lib/supabase";

type QuickPreset = "none" | "top-cyber" | "near-ipo" | "high-pexit";

type OpportunityCard = {
  id: number;
  grantId: string;
  companyId: string | null;
  name: string;
  stage: string;
  sector: string;
  valuation: number;
  minAllocation: number;
  pExit: number;
  liquidityHorizon: string;
  health: number;
  tier: string;
  hiringVelocity: number;
  investorTier: "tier-1" | "tier-2" | "tier-3";
  marketSentiment: number;
  runwayMonths: number;
  revenueSignal: number;
  blurb: string;
  optionPackages: Array<{ name: string; exerciseNeedUsd: number }>;
  optionCount: number;
};

const sectorOptions = ["All", "Cyber", "AI", "SaaS", "Fintech"] as const;

function normalizeSector(sector: string) {
  if (sector === "AI/ML") return "AI";
  if (sector.includes("Cyber") || sector.includes("Security")) return "Cyber";
  return sector;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash);
}

function getDealTimeline(pExit: number) {
  return pExit > 85 ? "Expected Horizon: 2–3 Years (Pre-IPO Stage)" : pExit > 75 ? "Expected Horizon: 3–5 Years (Growth Stage)" : "Expected Horizon: 5+ Years";
}

function buildCardFromGrant(grant: OptionGrantRecord, company: CompanyRecord | null): OpportunityCard {
  const analysis = company
    ? {
        ...buildAutonomousUnderwritingReport(grant.company_name),
        companyName: company.name,
        sector: company.sector,
        fundingStage: company.funding_stage || buildAutonomousUnderwritingReport(grant.company_name).fundingStage,
        pExit: Number(company.p_exit || 0),
        institutionalRiskScore: Number(company.institutional_risk_score || 0),
        companyLogoUrl: company.logo_url || buildAutonomousUnderwritingReport(grant.company_name).companyLogoUrl,
        companyOneLiner: company.one_liner || buildAutonomousUnderwritingReport(grant.company_name).companyOneLiner,
        scenarios: company.exit_scenarios?.length ? company.exit_scenarios : buildAutonomousUnderwritingReport(grant.company_name).scenarios,
        legalProfile: company.legal_profile as LiveCompanyAnalysis["legalProfile"],
        provenance: {
          ...buildAutonomousUnderwritingReport(grant.company_name).provenance,
          dataSources: company.ai_sources?.length ? company.ai_sources : buildAutonomousUnderwritingReport(grant.company_name).provenance.dataSources,
        },
      }
    : buildAutonomousUnderwritingReport(grant.company_name);

  const baseValuation = company?.fmv || analysis.scenarios[1].valuationUsd;
  const pExit = company?.p_exit || analysis.pExit;
  const fundingStage = company?.funding_stage || analysis.fundingStage;
  const exerciseNeed = grant.exercise_cost || grant.option_count * grant.strike_price;

  return {
    id: hashString(grant.id),
    grantId: grant.id,
    companyId: grant.company_id,
    name: grant.company_name,
    stage: fundingStage,
    sector: normalizeSector(company?.sector || analysis.sector),
    valuation: baseValuation,
    minAllocation: Math.max(100_000, exerciseNeed),
    pExit,
    liquidityHorizon: getDealTimeline(pExit),
    health: Math.min(98, Math.max(70, company?.confidence ? Math.round(company.confidence) : analysis.confidence)),
    tier: pExit > 85 ? "tier-1" : pExit > 75 ? "tier-2" : "tier-3",
    hiringVelocity: Math.max(5, Math.round(analysis.pExit / 8)),
    investorTier: pExit > 85 ? "tier-1" : pExit > 75 ? "tier-2" : "tier-3",
    marketSentiment: Math.min(0.95, Math.max(0.45, analysis.pExit / 100)),
    runwayMonths: pExit > 85 ? 24 : pExit > 75 ? 19 : 16,
    revenueSignal: Math.min(95, Math.max(48, analysis.institutionalRiskScore)),
    blurb: company?.one_liner || analysis.companyOneLiner,
    optionCount: grant.option_count,
    optionPackages: [
      { name: grant.employee_alias || "Anonymous Holder", exerciseNeedUsd: exerciseNeed },
      { name: `${grant.company_name} reserve pool`, exerciseNeedUsd: Math.round(exerciseNeed * 1.5) },
    ],
  };
}

function buildFallbackDeals(): OpportunityCard[] {
  return buildFallbackGrantRows().map((grant) => buildCardFromGrant(grant, null));
}

function buildFallbackGrantRows(): OptionGrantRecord[] {
  return [
    {
      id: "seed-grant-1",
      company_id: null,
      company_name: "Cyber Unicorn",
      employee_alias: "Anonymous Senior Engineer",
      option_count: 45_000,
      strike_price: 1,
      exercise_cost: 45_000,
      tax_route: "Section 102 trustee route",
      status: "pending_underwriting",
    },
    {
      id: "seed-grant-2",
      company_id: null,
      company_name: "Northstar AI",
      employee_alias: "Anonymous Head of Product",
      option_count: 70_000,
      strike_price: 1,
      exercise_cost: 70_000,
      tax_route: "Section 102 trustee route",
      status: "pending_underwriting",
    },
    {
      id: "seed-grant-3",
      company_id: null,
      company_name: "Lattice SaaS",
      employee_alias: "Anonymous Growth Lead",
      option_count: 38_000,
      strike_price: 1,
      exercise_cost: 38_000,
      tax_route: "Section 102 trustee route",
      status: "pending_underwriting",
    },
    {
      id: "seed-grant-4",
      company_id: null,
      company_name: "Vertex Fintech",
      employee_alias: "Anonymous CTO",
      option_count: 125_000,
      strike_price: 1,
      exercise_cost: 125_000,
      tax_route: "Section 102 trustee route",
      status: "pending_underwriting",
    },
  ];
}

export default function InvestorPage() {
  const defaultPreferences = loadInvestorPreferences();
  const [firm, setFirm] = useState(defaultPreferences.firmName);
  const [ticketSizeValue, setTicketSizeValue] = useState(defaultPreferences.ticketSizeUsd);
  const [selectedSectors, setSelectedSectors] = useState<string[]>(defaultPreferences.preferredSectors);
  const [risk, setRisk] = useState<RiskAppetite>(defaultPreferences.riskAppetite);
  const [activeSector, setActiveSector] = useState<(typeof sectorOptions)[number]>("All");
  const [valuationRange, setValuationRange] = useState(40_000_000);
  const [pExitFloor, setPExitFloor] = useState(80);
  const [ticketFloor, setTicketFloor] = useState(150_000);
  const [savedDeals, setSavedDeals] = useState<number[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);
  const [liveDeals, setLiveDeals] = useState<OpportunityCard[]>(buildFallbackDeals());
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [portfolioState, setPortfolioState] = useState<PortfolioState>(loadPortfolioState());
  const [confirmingDeal, setConfirmingDeal] = useState<(typeof liveDeals)[number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [successDealId, setSuccessDealId] = useState<number | null>(null);
  const [isAccreditedConfirmed, setIsAccreditedConfirmed] = useState(false);
  const [investorSignature, setInvestorSignature] = useState("");
  const [allocationRows, setAllocationRows] = useState<AllocationRecord[]>([]);
  const [selectedAllocationAmount, setSelectedAllocationAmount] = useState<number | null>(null);
  const [quickPreset, setQuickPreset] = useState<QuickPreset>("none");
  const [isAgreementPreviewOpen, setIsAgreementPreviewOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);
  const [dealRadarAlerts, setDealRadarAlerts] = useState([
    { id: 1, type: "valuation", company: "CyberUnicorn", message: "Valuation updated +25% following Series C round", time: "2 min ago" },
    { id: 2, type: "match", company: "Northstar AI", message: "New High-Match Option Package Available - VP Product role", time: "5 min ago" },
    { id: 3, type: "news", company: "Vertex Fintech", message: "Announced $15M strategic partnership with Stripe", time: "8 min ago" },
  ]);

  const pushToast = (message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  };

  useEffect(() => {
    const preferences = loadInvestorPreferences();
    setFirm(preferences.firmName);
    setTicketSizeValue(preferences.ticketSizeUsd);
    setSelectedSectors(preferences.preferredSectors);
    setRisk(preferences.riskAppetite);
    setPortfolioState(loadPortfolioState());
  }, []);

  useEffect(() => {
    saveInvestorPreferences({
      firmName: firm,
      ticketSizeUsd: ticketSizeValue,
      riskAppetite: risk as "Defensive" | "Balanced" | "Aggressive",
      preferredSectors: selectedSectors,
    });
  }, [firm, risk, selectedSectors, ticketSizeValue]);

  useEffect(() => {
    let mounted = true;

    async function refreshLiveData() {
      const [companies, grants, allocations] = await Promise.all([fetchCompanies(), fetchOptionGrants(), fetchAllocations()]);

      if (!mounted) return;

      setAllocationRows(allocations);

      const nextDeals = (grants.length ? grants : buildFallbackGrantRows()).map((grant) => {
        const company = companies.find((item) => item.id === grant.company_id || item.name === grant.company_name) || null;
        return buildCardFromGrant(grant, company);
      });

      setLiveDeals(nextDeals.length ? nextDeals : buildFallbackDeals());
    }

    refreshLiveData();

    const unsubscribe = subscribeToStrikeFeed((event) => {
      if (event.table === "option_grants") {
        refreshLiveData();
      }

      if (event.table === "allocations") {
        setAllocationRows((current) => {
          const exists = current.some((allocation) => allocation.id === event.record.id);
          return exists ? current.map((allocation) => (allocation.id === event.record.id ? event.record : allocation)) : [event.record, ...current];
        });
        refreshLiveData();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const filteredDeals = useMemo(() => {
    return liveDeals
      .filter((deal) => {
        const matchesSector = activeSector === "All" || deal.sector === activeSector;
        const matchesValuation = deal.valuation <= valuationRange;
        const matchesPexit = deal.pExit >= pExitFloor;
        const matchesTicket = deal.minAllocation >= ticketFloor;
        const matchesRisk =
          risk === "Aggressive" ||
          (risk === "Balanced" && deal.pExit >= 78) ||
          (risk === "Defensive" && deal.pExit >= 84);
        const matchesPreference = selectedSectors.length === 0 || selectedSectors.includes(deal.sector);
        const matchesPreset =
          quickPreset === "none" ||
          (quickPreset === "top-cyber" && deal.sector === "Cyber") ||
          (quickPreset === "near-ipo" && (deal.stage.includes("Series D") || deal.pExit >= 90)) ||
          (quickPreset === "high-pexit" && deal.pExit > 85);

        return matchesSector && matchesValuation && matchesPexit && matchesTicket && matchesRisk && matchesPreference && matchesPreset;
      })
      .sort((left, right) => {
        let score = 0;
        if (selectedSectors.includes(left.sector)) score += 2;
        if (left.minAllocation <= ticketSizeValue) score += 1;
        if (right.minAllocation <= ticketSizeValue) score -= 1;
        if (selectedSectors.includes(right.sector)) score -= 2;
        return score;
      });
  }, [activeSector, pExitFloor, quickPreset, risk, selectedSectors, ticketFloor, ticketSizeValue, valuationRange]);

  const applyQuickPreset = (preset: QuickPreset) => {
    setQuickPreset(preset);
    if (preset === "top-cyber") {
      setActiveSector("Cyber");
      setSelectedSectors((current) => (current.includes("Cyber") ? current : [...current, "Cyber"]));
      setPExitFloor(80);
      return;
    }
    if (preset === "near-ipo") {
      setActiveSector("All");
      setPExitFloor(90);
      return;
    }
    if (preset === "high-pexit") {
      setActiveSector("All");
      setPExitFloor(86);
      return;
    }
    setActiveSector("All");
  };

  const syndicateFunding = useMemo(() => {
    return liveDeals.reduce((acc, deal) => {
      const raised = allocationRows.filter((allocation) => allocation.grant_id === deal.grantId).reduce((sum, allocation) => sum + allocation.committed_amount, 0);
      acc[deal.id] = {
        raised,
        targetPool: Math.max(deal.minAllocation * 2.5, deal.minAllocation),
      };
      return acc;
    }, {} as Record<number, { raised: number; targetPool: number }>);
  }, [allocationRows, liveDeals]);

  const toggleSector = (sector: string) => {
    setSelectedSectors((current) =>
      current.includes(sector) ? current.filter((item) => item !== sector) : [...current, sector]
    );
  };

  const toggleSaveDeal = (deal: (typeof liveDeals)[number]) => {
    const isSaved = savedDeals.includes(deal.id);
    const nextSaved = isSaved ? savedDeals.filter((item) => item !== deal.id) : [...savedDeals, deal.id];
    setSavedDeals(nextSaved);

    const nextPortfolio: PortfolioState = {
      ...portfolioState,
      saved: isSaved
        ? portfolioState.saved.filter((entry) => entry.id !== deal.id)
        : [
            ...portfolioState.saved,
            {
              id: deal.id,
              name: deal.name,
              stage: deal.stage,
              sector: deal.sector,
              amount: deal.minAllocation,
              note: deal.blurb,
              type: "saved",
            } as PortfolioEntry,
          ],
    };
    setPortfolioState(nextPortfolio);
    savePortfolioState(nextPortfolio);
  };

  const requestAllocation = (deal: (typeof liveDeals)[number]) => {
    setConfirmingDeal(deal);
    setIsAccreditedConfirmed(false);
    setInvestorSignature("");
    setSelectedAllocationAmount(deal.minAllocation);
  };

  const submitConfirmedAllocation = async () => {
    if (!confirmingDeal || !selectedAllocationAmount) return;
    setIsSubmitting(true);

    await insertAllocation({
      grant_id: confirmingDeal.grantId,
      investor_firm: firm || "Anonymous investor",
      committed_amount: selectedAllocationAmount,
      status: "approved",
      signed_loi: true,
      signature_name: investorSignature,
    });

    await updateGrantStatus(confirmingDeal.grantId, "matched");

    setAllocationRows((current) => [
      {
        id: `local-${Date.now()}`,
        grant_id: confirmingDeal.grantId,
        investor_firm: firm || "Anonymous investor",
        committed_amount: selectedAllocationAmount,
        status: "approved",
        signed_loi: true,
        signature_name: investorSignature,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...current,
    ]);

    setLiveDeals((current) => current.map((deal) => (deal.grantId === confirmingDeal.grantId ? { ...deal, pExit: Math.min(95, deal.pExit + 1), health: Math.min(98, deal.health + 1) } : deal)));

    const nextPortfolio: PortfolioState = {
      ...portfolioState,
      pending: [
        {
          id: confirmingDeal.id,
          name: confirmingDeal.name,
          stage: confirmingDeal.stage,
          sector: confirmingDeal.sector,
          amount: selectedAllocationAmount,
          note: `Pending approval for ${confirmingDeal.name}`,
          type: "pending",
        },
        ...portfolioState.pending,
      ],
    };
    setPortfolioState(nextPortfolio);
    savePortfolioState(nextPortfolio);
    setSavedDeals((current) => (current.includes(confirmingDeal.id) ? current : [...current, confirmingDeal.id]));
    setSuccessDealId(confirmingDeal.id);
    setIsSubmitting(false);
    setSubmissionNotice(`Allocation request signed for ${confirmingDeal.name}.`);
    setLiveMessage(`🔴 LIVE: Signed LOI streamed for ${confirmingDeal.name}`);
    pushToast(`LOI signed for ${confirmingDeal.name}`);

    // Auto-hide success state after 3.5 seconds
    setTimeout(() => {
      setSuccessDealId(null);
      setConfirmingDeal(null);
      setSelectedDeal(null);
    }, 3500);
  };

  const selectedDealData = liveDeals.find((deal) => deal.id === selectedDeal);
  const selectedDealAnalysis = selectedDealData ? evaluateStartup(selectedDealData) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="rounded-[36px] border border-[#E8E4DC] bg-[#F9F6EE] px-6 py-8 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0C3B2E]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0C3B2E]" /> Investor marketplace
            </div>
            <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-[#0C3B2E] sm:text-5xl lg:text-6xl">A high-conviction opportunity feed for premium capital.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5A5A58]">Filter live startup opportunities by sector, valuation, quality, and allocation fit, then move from discovery to allocation in one fluid flow.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/investor/profile" className="rounded-full border border-[#E0DCD3] bg-white/80 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition hover:-translate-y-0.5 hover:bg-white">
              Profile
            </Link>
            <Link href="/investor/portfolio" className="rounded-full border border-[#E0DCD3] bg-white/80 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition hover:-translate-y-0.5 hover:bg-white">
              Portfolio
            </Link>
            <Link href="/investor/pipeline" className="rounded-full border border-[#E0DCD3] bg-white/80 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition hover:-translate-y-0.5 hover:bg-white">
              Open pipeline
            </Link>
            <Link href="/" className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
              Back to gatekeeper
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-8 xl:grid-cols-[300px_1fr]">
        {/* ─── Left sidebar: mandate profile + filter controls ─── */}
        <motion.aside initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          {/* Profile card */}
          <div className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
            <div className="rounded-[24px] bg-[#0C3B2E] p-5 text-white">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#A8C5BA]">Mandate profile</p>
              <h2 className="mt-2 font-serif text-xl text-white">{firm || "Your firm"}</h2>
              <p className="mt-1 text-xs leading-6 text-[#A8C5BA]">{formatTicketSize(ticketSizeValue)} · {risk}</p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[#5A5A58]">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">Firm or angel name</span>
                <input value={firm} onChange={(event) => setFirm(event.target.value)} className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2.5 text-sm outline-none" />
              </label>

              <label className="block text-sm text-[#5A5A58]">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">Ticket size</span>
                <select value={ticketSizeValue} onChange={(event) => setTicketSizeValue(Number(event.target.value))} className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2.5 text-sm outline-none">
                  {[50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000].map((size) => (
                    <option key={size} value={size}>{formatTicketSize(size)}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-[#5A5A58]">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">Risk appetite</span>
                <select value={risk} onChange={(event) => setRisk(event.target.value as RiskAppetite)} className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2.5 text-sm outline-none">
                  <option value="Defensive">Defensive</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Aggressive">Aggressive</option>
                </select>
              </label>
            </div>
          </div>

          {/* Sector filter card */}
          <div className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Sector filter</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sectorOptions.map((sector) => (
                <button key={sector} onClick={() => setActiveSector(sector)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${activeSector === sector ? "border-[#0C3B2E] bg-[#0C3B2E] text-white" : "border-[#E8E4DC] bg-[#F9F6EE] text-[#5A5A58] hover:border-[#0C3B2E]/30"}`}>
                  {sector}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Mandate sectors</p>
              <div className="flex flex-wrap gap-2">
                {sectorOptions.filter((s) => s !== "All").map((sector) => (
                  <button key={sector} type="button" onClick={() => toggleSector(sector)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${selectedSectors.includes(sector) ? "border-[#0C3B2E] bg-[#F0ECE1] text-[#0C3B2E]" : "border-[#E8E4DC] bg-[#F9F6EE] text-[#5A5A58]"}`}>
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[#5A5A58]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">Max valuation</span>
                  <span className="text-xs font-semibold text-[#0C3B2E]">${(valuationRange / 1_000_000).toFixed(0)}M</span>
                </div>
                <input type="range" min="15000000" max="60000000" step="1000000" value={valuationRange} onChange={(event) => setValuationRange(Number(event.target.value))} className="w-full accent-[#0C3B2E]" />
              </label>
              <label className="block text-sm text-[#5A5A58]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">Min Pexit</span>
                  <span className="text-xs font-semibold text-[#0C3B2E]">{pExitFloor}%</span>
                </div>
                <input type="range" min="70" max="95" value={pExitFloor} onChange={(event) => setPExitFloor(Number(event.target.value))} className="w-full accent-[#0C3B2E]" />
              </label>
              <label className="block text-sm text-[#5A5A58]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">Min ticket</span>
                  <span className="text-xs font-semibold text-[#0C3B2E]">${(ticketFloor / 1_000).toFixed(0)}K</span>
                </div>
                <input type="range" min="100000" max="400000" step="50000" value={ticketFloor} onChange={(event) => setTicketFloor(Number(event.target.value))} className="w-full accent-[#0C3B2E]" />
              </label>
            </div>
          </div>
        </motion.aside>

        {/* ─── Right: Live opportunity feed ─── */}
        <div className="space-y-5">
          {/* Status banners */}
          <AnimatePresence>
            {submissionNotice && (
              <motion.div key="submission" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
                {submissionNotice}
              </motion.div>
            )}
            {liveMessage && (
              <motion.div key="live" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700">
                {liveMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-[28px] border border-[#E8E4DC] bg-white/80 p-5 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">Quick filter presets</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { key: "top-cyber", label: "Top Cyber Deals" },
                { key: "near-ipo", label: "Near IPO (<2 Yrs)" },
                { key: "high-pexit", label: "High Pexit >85%" },
                { key: "none", label: "Clear" },
              ].map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => applyQuickPreset(preset.key as QuickPreset)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    quickPreset === preset.key
                      ? "border-[#0C3B2E] bg-[#0C3B2E] text-white"
                      : "border-[#E8E4DC] bg-[#F9F6EE] text-[#5A5A58] hover:border-[#0C3B2E]/30"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Deal Radar Alerts Panel ── */}
          <div className="rounded-[28px] border-2 border-amber-200 bg-amber-50 p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700">Deal Radar</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">{dealRadarAlerts.length} alerts</span>
            </div>
            <div className="mt-4 space-y-3">
              {dealRadarAlerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-amber-300 bg-white/70 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[#0C3B2E]">
                        {alert.type === "valuation" && "📈 Valuation Update"}
                        {alert.type === "match" && "🎯 New High-Match Package"}
                        {alert.type === "news" && "📰 Company News"}
                      </p>
                      <p className="mt-1 text-xs leading-4 text-[#5A5A58]">{alert.message}</p>
                    </div>
                    <span className="whitespace-nowrap text-[10px] font-medium text-[#5A5A58]">{alert.time}</span>
                  </div>
                  {alert.type === "valuation" && (
                    <button className="mt-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700 transition hover:bg-amber-200">
                      Review Impact
                    </button>
                  )}
                  {alert.type === "match" && (
                    <button className="mt-2 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700 transition hover:bg-emerald-200">
                      View Package
                    </button>
                  )}
                  {alert.type === "news" && (
                    <button className="mt-2 rounded-full border border-blue-300 bg-blue-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-700 transition hover:bg-blue-200">
                      Read Full
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Opportunity cards — vertical feed */}
          {filteredDeals.map((deal, index) => {
            const result = evaluateStartup(deal);
            const isSaved = savedDeals.includes(deal.id);
            const matchLabel = selectedSectors.includes(deal.sector) ? "Strong fit" : "Watchlist";
            const horizonShort = deal.liquidityHorizon.replace("Expected Horizon: ", "").split(" (")[0];
            return (
              <motion.article
                key={deal.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.42, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-7 shadow-[0_20px_80px_rgba(12,59,46,0.06)] transition-shadow duration-300 hover:shadow-[0_28px_100px_rgba(12,59,46,0.1)]"
              >
                {/* ── Live status badge + match label ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live Allocation&nbsp;·&nbsp;{deal.stage}&nbsp;·&nbsp;{deal.sector}
                  </div>
                  <span className="rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0C3B2E]">
                    {matchLabel}
                  </span>
                </div>

                {/* ── Company name + score badges ── */}
                <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={result.companyLogoUrl}
                        alt={deal.name}
                        className="h-10 w-10 rounded-lg border border-[#E8E4DC] bg-[#F9F6EE] object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                      <h3 className="font-serif text-3xl leading-tight text-[#0C3B2E] lg:text-4xl">{deal.name}</h3>
                    </div>
                    <p className="text-xs leading-5 text-[#5A5A58]">{result.companyOneLiner}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex flex-col items-center rounded-2xl border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-2.5">
                      <span className="text-lg font-bold leading-none text-[#0C3B2E]">{deal.health}</span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.25em] text-[#5A5A58]">Health</span>
                    </div>
                    <div className="flex flex-col items-center rounded-2xl bg-[#0C3B2E] px-4 py-2.5">
                      <span className="text-lg font-bold leading-none text-white">{result.pExit}%</span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.25em] text-[#A8C5BA]">Pexit</span>
                    </div>
                  </div>
                </div>

                {/* ── Deal description ── */}
                <p className="mt-4 text-sm leading-7 text-[#5A5A58]">{deal.blurb}</p>

                {/* ── Data pills ── */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2 text-xs font-medium text-[#5A5A58]">
                    FMV <span className="font-bold text-[#0C3B2E]">${(result.fmv / 1_000_000).toFixed(1)}M</span>
                  </span>
                  <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2 text-xs font-medium text-[#5A5A58]">
                    Horizon <span className="font-bold text-[#0C3B2E]">{horizonShort}</span>
                  </span>
                  <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2 text-xs font-medium text-[#5A5A58]">
                    Min alloc <span className="font-bold text-[#0C3B2E]">${(deal.minAllocation / 1_000).toFixed(0)}K</span>
                  </span>
                  <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2 text-xs font-medium text-[#5A5A58]">
                    Risk <span className="font-bold text-[#0C3B2E]">{result.riskRating}</span>
                  </span>
                  <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-2 text-xs font-medium text-[#5A5A58]">
                    Confidence <span className="font-bold text-[#0C3B2E]">{result.confidenceScore}%</span>
                  </span>
                </div>

                {/* ── Fractional Syndicate Pool (if minAllocation > $100K) ── */}
                {deal.minAllocation > 100_000 && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Syndicate Progress</p>
                        <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                          {Math.round((syndicateFunding[deal.id].raised / syndicateFunding[deal.id].targetPool) * 100)}% Funded
                        </p>
                        <p className="mt-1 text-xs text-emerald-600">
                          ${Math.round((syndicateFunding[deal.id].targetPool - syndicateFunding[deal.id].raised) / 1000)}K remaining
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#5A5A58]">Target pool</p>
                        <p className="mt-1 font-semibold text-[#0C3B2E]">${(syndicateFunding[deal.id].targetPool / 1_000).toFixed(0)}K</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-emerald-200">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, (syndicateFunding[deal.id].raised / syndicateFunding[deal.id].targetPool) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Action bar ── */}
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#F0ECE1] pt-5">
                  <button
                    onClick={() => requestAllocation(deal)}
                    className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F] active:scale-[0.98]"
                  >
                    Request Allocation
                  </button>
                  <button
                    onClick={() => setSelectedDeal(deal.id)}
                    className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white active:scale-[0.98]"
                  >
                    View AI Sources
                  </button>
                  <button
                    onClick={() => toggleSaveDeal(deal)}
                    className={`rounded-full border px-6 py-3 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${isSaved ? "border-[#0C3B2E] bg-[#F0ECE1] text-[#0C3B2E]" : "border-[#E0DCD3] bg-white/90 text-[#1A1A1A] hover:bg-white"}`}
                  >
                    {isSaved ? "Bookmarked ✓" : "Bookmark"}
                  </button>
                </div>
              </motion.article>
            );
          })}

          {filteredDeals.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[32px] border border-dashed border-[#E2DDD0] bg-[#F9F6EE] p-10 text-center text-sm text-[#5A5A58]">
              <p className="font-serif text-2xl text-[#0C3B2E]">No live opportunities match this mandate.</p>
              <p className="mt-2">Try clearing quick presets or softening your ticket and Pexit thresholds.</p>
              <button
                onClick={() => {
                  setQuickPreset("none");
                  setActiveSector("All");
                  setPExitFloor(75);
                  setTicketFloor(100_000);
                }}
                className="mt-5 rounded-full bg-[#0C3B2E] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#124E3F]"
              >
                Reset Filters
              </button>
            </motion.div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {confirmingDeal && !successDealId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-2xl rounded-[32px] border border-[#E8E4DC] bg-white/95 p-8 shadow-[0_30px_120px_rgba(12,59,46,0.16)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5A5A58]">Allocation lock-in</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#0C3B2E]">Confirm your allocation for {confirmingDeal.name}</h3>
                </div>
                <button onClick={() => setConfirmingDeal(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Close</button>
              </div>

              {/* ── Commitment summary ── */}
              <div className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700">Fractional Allocation Options</p>
                <p className="mt-2 text-sm text-[#5A5A58]">Choose your commitment level to this syndicate pool:</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedAllocationAmount && setSelectedAllocationAmount(10_000)}
                    className={`rounded-full border-2 px-4 py-2.5 text-xs font-semibold uppercase transition ${
                      selectedAllocationAmount === 10_000
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400"
                    }`}
                  >
                    Partial ($10K min)
                  </button>
                  <button
                    onClick={() => setSelectedAllocationAmount && setSelectedAllocationAmount(confirmingDeal.minAllocation / 2)}
                    className={`rounded-full border-2 px-4 py-2.5 text-xs font-semibold uppercase transition ${
                      selectedAllocationAmount === confirmingDeal.minAllocation / 2
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400"
                    }`}
                  >
                    Half Allocation
                  </button>
                  <button
                    onClick={() => setSelectedAllocationAmount && setSelectedAllocationAmount(confirmingDeal.minAllocation)}
                    className={`rounded-full border-2 px-4 py-2.5 text-xs font-semibold uppercase transition ${
                      selectedAllocationAmount === confirmingDeal.minAllocation
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400"
                    }`}
                  >
                    Full Allocation
                  </button>
                </div>
              </div>

              {/* ── Commitment summary ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-[#F9F6EE] p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Your commitment</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#E8E4DC] bg-white/80 p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Allocation amount</p>
                    <p className="mt-2 font-serif text-2xl font-bold text-[#0C3B2E]">${(selectedAllocationAmount || confirmingDeal.minAllocation).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-[#E8E4DC] bg-white/80 p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Estimated equity</p>
                    <p className="mt-2 font-serif text-2xl font-bold text-[#1A1A1A]">{Math.max(1, Math.round((selectedAllocationAmount || confirmingDeal.minAllocation) / 10_000)).toLocaleString()} units</p>
                  </div>
                </div>
              </div>

              {/* ── Fee breakdown ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-[#F9F6EE] p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Cost breakdown</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-white/80 px-4 py-3">
                    <span className="text-[#5A5A58]">Allocation amount</span>
                    <span className="font-semibold text-[#1A1A1A]">${(selectedAllocationAmount || confirmingDeal.minAllocation).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-white/80 px-4 py-3">
                    <span className="text-[#5A5A58]">Management fee (2%)</span>
                    <span className="font-semibold text-[#1A1A1A]">${Math.round((selectedAllocationAmount || confirmingDeal.minAllocation) * 0.02).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-white/80 px-4 py-3">
                    <span className="text-[#5A5A58]">Platform fee (0.5%)</span>
                    <span className="font-semibold text-[#1A1A1A]">${Math.round((selectedAllocationAmount || confirmingDeal.minAllocation) * 0.005).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border-2 border-[#0C3B2E] bg-[#F0ECE1] px-4 py-3 font-semibold">
                    <span className="text-[#0C3B2E]">Total commitment</span>
                    <span className="text-lg text-[#0C3B2E]">${(confirmingDeal.minAllocation + Math.round(confirmingDeal.minAllocation * 0.025)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* ── Terms ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-[#F9F6EE] p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Secondary Participation Agreement Preview</p>
                <button
                  onClick={() => setIsAgreementPreviewOpen(true)}
                  className="mt-3 rounded-full border border-[#E0DCD3] bg-white/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1A1A1A] transition hover:bg-white"
                >
                  View Draft Agreements
                </button>
                <ul className="mt-3 space-y-2 text-sm text-[#5A5A58]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0C3B2E]" />
                    <span>Minimum holding period: 24 months from close date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0C3B2E]" />
                    <span>Target exit horizon: {confirmingDeal.liquidityHorizon}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0C3B2E]" />
                    <span>Pro-rata rights on follow-on financing rounds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0C3B2E]" />
                    <span>1x non-participating preferred on exit</span>
                  </li>
                </ul>
              </div>

              {/* ── Accreditation Verification ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-[#F9F6EE] p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Regulatory Verification</p>
                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isAccreditedConfirmed}
                    onChange={() => setIsAccreditedConfirmed(!isAccreditedConfirmed)}
                    className="mt-1 h-5 w-5 accent-[#0C3B2E]"
                  />
                  <span className="text-sm text-[#1A1A1A]">
                    I certify that I am an accredited investor as defined by the SEC and meet the net worth or income thresholds required for this private offering.
                  </span>
                </label>
              </div>

              {/* ── Digital Signature ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-[#F9F6EE] p-6 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Digital Signature</p>
                <p className="mt-2 text-xs text-[#5A5A58]">Sign below to execute this Secondary Participation Agreement electronically.</p>
                <input
                  type="text"
                  value={investorSignature}
                  onChange={(e) => setInvestorSignature(e.target.value)}
                  placeholder="Type your full legal name to sign"
                  className="mt-3 w-full rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 text-sm outline-none"
                />
                {investorSignature && (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-700 font-semibold">✓ Signature captured</p>
                    <p className="mt-1 text-sm italic text-[#1A1A1A]">{investorSignature}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setConfirmingDeal(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Cancel</button>
                <button onClick={submitConfirmedAllocation} disabled={isSubmitting || !isAccreditedConfirmed || !investorSignature} className="rounded-full bg-[#0C3B2E] px-8 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? "Executing..." : investorSignature ? "Execute Agreement" : "Sign to proceed"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Success state modal ── */}
        {successDealId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-xl rounded-[32px] border border-emerald-200 bg-white/95 p-8 shadow-[0_30px_120px_rgba(12,59,46,0.16)] backdrop-blur-2xl"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"
                >
                  <span className="text-2xl">✓</span>
                </motion.div>
                <h3 className="mt-4 font-serif text-2xl text-[#0C3B2E]">Allocation request locked</h3>
                <p className="mt-3 text-sm leading-7 text-[#5A5A58]">
                  Your {confirmingDeal?.minAllocation && `$${confirmingDeal.minAllocation.toLocaleString()} `}allocation request for <span className="font-semibold">{confirmingDeal?.name}</span> has been successfully submitted.
                </p>
                <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    🚀 Our private deal team will reach out within 2 hours to confirm syndicate approval.
                  </p>
                  <p className="mt-2 text-xs text-emerald-600">Check your portfolio dashboard to track this request in real-time.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedDealData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-2xl rounded-[32px] border border-[#E8E4DC] bg-white/90 p-7 shadow-[0_30px_120px_rgba(12,59,46,0.16)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5A5A58]">AI underwriting report</p>
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={selectedDealAnalysis?.companyLogoUrl}
                      alt={selectedDealData?.name}
                      className="h-8 w-8 rounded-lg border border-[#E8E4DC] bg-[#F9F6EE] object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                    <div className="flex flex-col">
                      <h3 className="font-serif text-xl text-[#0C3B2E]">{selectedDealData?.name}</h3>
                      <p className="text-xs leading-4 text-[#5A5A58]">{selectedDealAnalysis?.companyOneLiner}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedDeal(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Close</button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {evaluateStartup(selectedDealData).scenarios.map((scenario, idx) => {
                  const allocationAmount = selectedDealData?.minAllocation || 250_000;
                  const roi = ((scenario.valuationUsd - allocationAmount) / allocationAmount) * 100;
                  const timelineYears = scenario.label === "Bull Case" ? 3.5 : scenario.label === "Base Case" ? 4.5 : 5.5;
                  const irr = (Math.pow(scenario.valuationUsd / allocationAmount, 1 / timelineYears) - 1) * 100;
                  const scenarioColor = scenario.label === "Bull Case" ? "bg-emerald-50 border-emerald-200" : scenario.label === "Base Case" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200";
                  const textColor = scenario.label === "Bull Case" ? "text-emerald-700" : scenario.label === "Base Case" ? "text-amber-700" : "text-rose-700";
                  
                  return (
                    <div key={scenario.label} className={`rounded-[24px] border-2 ${scenarioColor} p-5 shadow-[0_10px_30px_rgba(12,59,46,0.03)]`}>
                      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${textColor}`}>{scenario.label}</p>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-[#5A5A58]">Exit Valuation</p>
                          <p className="mt-1 font-serif text-xl font-bold text-[#1A1A1A]">${(scenario.valuationUsd / 1_000_000).toFixed(1)}M</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-[#5A5A58]">Estimated ROI</p>
                          <p className={`mt-1 font-serif text-lg font-bold ${textColor}`}>{roi.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-[#5A5A58]">Projected IRR</p>
                          <p className={`mt-1 font-serif text-lg font-bold ${textColor}`}>{irr.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-[#5A5A58]">Timeline</p>
                          <p className="mt-1 text-sm text-[#1A1A1A]">~{timelineYears.toFixed(1)} years</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-[#5A5A58]">{scenario.summary}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#1A1A1A]">AI Data Foundation</h4>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Source transparency</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-[#5A5A58]">
                  {selectedDealAnalysis?.provenance.dataSources.map((source) => (
                    <a key={source.label} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-white/80 px-3 py-3 text-sm text-[#5A5A58] transition-all duration-300 hover:border-[#0C3B2E]/40 hover:bg-[#F0ECE1] hover:text-[#0C3B2E]">
                      <span>{source.label}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <h4 className="font-semibold text-[#1A1A1A]">Anonymous option packages</h4>
                <div className="mt-4 grid gap-3">
                  {selectedDealData.optionPackages.map((option) => (
                    <div key={option.name} className="flex flex-col gap-3 rounded-2xl border border-[#E8E4DC] bg-white/80 px-3 py-3 text-sm shadow-[0_10px_30px_rgba(12,59,46,0.03)] md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{option.name}</p>
                        <p className="text-[#5A5A58]">Exercise need: ${option.exerciseNeedUsd.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className="group relative inline-flex">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-700">Full Grant Allocation Only</span>
                          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-xl border border-[#E8E4DC] bg-[#0C3B2E] px-3 py-2 text-[11px] leading-5 text-slate-100 shadow-xl group-hover:block">
                            To guarantee full exercise funding for the employee, each option bundle is allocated as a single unified ticket.
                          </span>
                        </div>
                        <button className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F]">Fund package</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSelectedDeal(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Cancel</button>
                <button onClick={() => requestAllocation(selectedDealData)} className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F]">Open confirmation</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AgreementPreviewModal
        isOpen={isAgreementPreviewOpen}
        onClose={() => setIsAgreementPreviewOpen(false)}
        mode="investor"
        data={{
          employeeName: confirmingDeal?.name || selectedDealData?.name || "Employee Holder",
          companyName: confirmingDeal?.name || selectedDealData?.name || "Strike Opportunity",
          optionCount: confirmingDeal?.optionCount || selectedDealData?.optionCount || 0,
          strikePrice: 0,
          estimatedNetProceeds: confirmingDeal?.minAllocation || selectedDealData?.minAllocation || 0,
          commitmentAmount: selectedAllocationAmount || confirmingDeal?.minAllocation || selectedDealData?.minAllocation || 0,
          investorFirmName: firm || "Investor Firm",
          targetCompanyAlias: confirmingDeal?.name || selectedDealData?.name || "Strike Opportunity",
          transactionDate: new Date().toISOString(),
          executionDate: new Date().toISOString(),
        }}
      />

      <div className="pointer-events-none fixed right-6 top-24 z-[85] flex w-[320px] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, y: -6 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 12, y: -6 }}
              className="rounded-2xl border border-emerald-200 bg-[#FBF9F5] px-4 py-3 text-sm font-semibold text-[#0C3B2E] shadow-[0_16px_50px_rgba(12,59,46,0.14)]"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
