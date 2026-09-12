"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, CircleAlert, Signature, ShieldCheck, TimerReset, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildAutonomousUnderwritingReport, type LiveCompanyAnalysis } from "@/lib/ai-underwriter";
import {
  fetchAllocations,
  fetchCompanies,
  fetchOptionGrants,
  insertOptionGrant,
  subscribeToStrikeFeed,
  upsertCompanyProfile,
  updateAllocationStatus,
  updateGrantStatus,
  type AllocationRecord,
  type AllocationStatus,
  type CompanyRecord,
  type GrantStatus,
  type OptionGrantRecord,
} from "@/lib/supabase";

type DealView = {
  grant: OptionGrantRecord;
  company: CompanyRecord | null;
  analysis: LiveCompanyAnalysis;
};

type DevRole = "employee" | "investor" | "admin";

const statusBadgeConfig: Record<GrantStatus, { bg: string; border: string; text: string; label: string }> = {
  pending_underwriting: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", label: "Pending Underwriting" },
  approved: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", label: "Flagged for Review" },
  live: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", label: "Live on Marketplace" },
  matched: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-800", label: "Matched" },
};

const allocationBadgeConfig: Record<AllocationStatus, { bg: string; border: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", label: "Pending" },
  approved: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", label: "Approved" },
  settled: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", label: "Settled" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function toNumericDate(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function buildFallbackGrants(): OptionGrantRecord[] {
  const fallbacks = [
    { company_name: "Cyber Unicorn", employee_alias: "Senior Security Engineer", option_count: 45_000, strike_price: 0.96, status: "pending_underwriting" as const },
    { company_name: "Northstar AI", employee_alias: "VP Product", option_count: 70_000, strike_price: 1.18, status: "approved" as const },
    { company_name: "Vertex Fintech", employee_alias: "Director of Risk", option_count: 125_000, strike_price: 0.84, status: "live" as const },
    { company_name: "Lattice SaaS", employee_alias: "Growth Lead", option_count: 38_000, strike_price: 0.62, status: "matched" as const },
  ];

  return fallbacks.map((entry, index) => ({
    id: `seed-grant-${index + 1}`,
    company_id: null,
    company_name: entry.company_name,
    employee_alias: entry.employee_alias,
    option_count: entry.option_count,
    strike_price: entry.strike_price,
    exercise_cost: entry.option_count * entry.strike_price,
    tax_route: "Section 102 trustee route",
    status: entry.status,
    created_at: new Date(Date.now() - index * 3_600_000).toISOString(),
    updated_at: new Date(Date.now() - index * 3_600_000).toISOString(),
  }));
}

function buildFallbackAllocations(): AllocationRecord[] {
  return [
    {
      id: "seed-allocation-1",
      grant_id: "seed-grant-2",
      investor_firm: "Accel Partners",
      committed_amount: 250_000,
      status: "pending",
      signed_loi: true,
      signature_name: "Jordan Lee",
      created_at: new Date(Date.now() - 1_800_000).toISOString(),
      updated_at: new Date(Date.now() - 1_800_000).toISOString(),
    },
    {
      id: "seed-allocation-2",
      grant_id: "seed-grant-3",
      investor_firm: "Sequoia Capital",
      committed_amount: 180_000,
      status: "approved",
      signed_loi: true,
      signature_name: "Maya Singh",
      created_at: new Date(Date.now() - 4_200_000).toISOString(),
      updated_at: new Date(Date.now() - 4_200_000).toISOString(),
    },
    {
      id: "seed-allocation-3",
      grant_id: "seed-grant-4",
      investor_firm: "Benchmark",
      committed_amount: 220_000,
      status: "settled",
      signed_loi: true,
      signature_name: "Priya Patel",
      created_at: new Date(Date.now() - 8_100_000).toISOString(),
      updated_at: new Date(Date.now() - 8_100_000).toISOString(),
    },
  ];
}

function mergeDealView(grant: OptionGrantRecord, company: CompanyRecord | null): DealView {
  const fallbackAnalysis = buildAutonomousUnderwritingReport(grant.company_name);
  const analysis = company
    ? {
        ...fallbackAnalysis,
        companyName: company.name,
        sector: company.sector,
        fundingStage: company.funding_stage || fallbackAnalysis.fundingStage,
        pExit: Number(company.p_exit || fallbackAnalysis.pExit),
        institutionalRiskScore: Number(company.institutional_risk_score || fallbackAnalysis.institutionalRiskScore),
        companyLogoUrl: company.logo_url || fallbackAnalysis.companyLogoUrl,
        companyOneLiner: company.one_liner || fallbackAnalysis.companyOneLiner,
        scenarios: company.exit_scenarios?.length ? company.exit_scenarios : fallbackAnalysis.scenarios,
        legalProfile: (company.legal_profile as LiveCompanyAnalysis["legalProfile"]) || fallbackAnalysis.legalProfile,
        provenance: {
          ...fallbackAnalysis.provenance,
          dataSources: company.ai_sources?.length ? company.ai_sources : fallbackAnalysis.provenance.dataSources,
        },
        summary: company.one_liner || fallbackAnalysis.summary,
        confidence: Number(company.confidence || fallbackAnalysis.confidence),
      }
    : fallbackAnalysis;

  return {
    grant,
    company,
    analysis,
  };
}

function sortDeals(left: DealView, right: DealView) {
  const priority = (status: GrantStatus) => (status === "pending_underwriting" ? 0 : status === "approved" ? 1 : status === "live" ? 2 : 3);
  const statusDelta = priority(left.grant.status) - priority(right.grant.status);
  if (statusDelta !== 0) return statusDelta;
  return toNumericDate(right.grant.updated_at) - toNumericDate(left.grant.updated_at);
}

export default function AdminPage() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [grants, setGrants] = useState<OptionGrantRecord[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [updatingGrantId, setUpdatingGrantId] = useState<string | null>(null);
  const [updatingAllocationId, setUpdatingAllocationId] = useState<string | null>(null);
  const [devRole, setDevRole] = useState<DevRole>("admin");
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const storedRole = window.localStorage.getItem("strike:view-as-role");
    if (storedRole === "employee" || storedRole === "investor" || storedRole === "admin") {
      setDevRole(storedRole);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const [companyData, grantData, allocationData] = await Promise.all([fetchCompanies(), fetchOptionGrants(), fetchAllocations()]);

      if (!mounted) return;

      setCompanies(companyData);
      setGrants(grantData.length ? grantData : buildFallbackGrants());
      setAllocations(allocationData.length ? allocationData : buildFallbackAllocations());
    }

    loadData();

    const unsubscribe = subscribeToStrikeFeed((event) => {
      if (event.table === "companies") {
        setCompanies((current) => {
          const exists = current.some((company) => company.id === event.record.id);
          return exists ? current.map((company) => (company.id === event.record.id ? event.record : company)) : [event.record, ...current];
        });
      }

      if (event.table === "option_grants") {
        setGrants((current) => {
          const exists = current.some((grant) => grant.id === event.record.id);
          return exists ? current.map((grant) => (grant.id === event.record.id ? event.record : grant)) : [event.record, ...current];
        });
      }

      if (event.table === "allocations") {
        setAllocations((current) => {
          const exists = current.some((allocation) => allocation.id === event.record.id);
          return exists ? current.map((allocation) => (allocation.id === event.record.id ? event.record : allocation)) : [event.record, ...current];
        });
      }

      setActivityMessage(`${event.table.replace("_", " ")} ${event.eventType.toLowerCase()} received in realtime.`);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const dealQueue = useMemo(() => {
    return grants
      .map((grant) => {
        const company = companies.find((item) => item.id === grant.company_id || item.name === grant.company_name) || null;
        return mergeDealView(grant, company);
      })
      .sort(sortDeals);
  }, [companies, grants]);

  const visibleDealQueue = useMemo(() => {
    if (devRole === "employee") return dealQueue.filter((deal) => deal.grant.status !== "matched");
    if (devRole === "investor") return dealQueue.filter((deal) => deal.grant.status === "live");
    return dealQueue;
  }, [dealQueue, devRole]);

  const visibleAllocations = useMemo(() => {
    if (devRole === "employee") return allocations.filter((allocation) => allocation.status !== "settled");
    if (devRole === "investor") return allocations.filter((allocation) => allocation.signed_loi);
    return allocations;
  }, [allocations, devRole]);

  const selectedDeal = dealQueue.find((item) => item.grant.id === selectedGrantId) || null;

  const totalVolume = allocations.reduce((sum, allocation) => sum + allocation.committed_amount, 0);
  const liveGrantCount = grants.filter((grant) => grant.status === "live" || grant.status === "matched").length;
  const averagePexit = companies.length ? Math.round(companies.reduce((sum, company) => sum + Number(company.p_exit || 0), 0) / companies.length) : 0;
  const signedLoiCount = allocations.filter((allocation) => allocation.signed_loi).length;
  const conversionRate = grants.length ? Math.round((liveGrantCount / grants.length) * 100) : 0;

  async function transitionGrantStatus(grantId: string, status: GrantStatus, message: string) {
    setUpdatingGrantId(grantId);
    await updateGrantStatus(grantId, status);
    setGrants((current) => current.map((grant) => (grant.id === grantId ? { ...grant, status, updated_at: new Date().toISOString() } : grant)));
    setUpdatingGrantId(null);
    setActivityMessage(message);
  }

  async function transitionAllocationStatus(allocationId: string, status: AllocationStatus, message: string) {
    setUpdatingAllocationId(allocationId);
    await updateAllocationStatus(allocationId, status);
    setAllocations((current) => current.map((allocation) => (allocation.id === allocationId ? { ...allocation, status, updated_at: new Date().toISOString() } : allocation)));
    setUpdatingAllocationId(null);
    setActivityMessage(message);
  }

  function switchRole(role: DevRole) {
    setDevRole(role);
    window.localStorage.setItem("strike:view-as-role", role);
    setActivityMessage(`Viewing admin suite as ${role}.`);
  }

  async function seedTestData() {
    setIsSeeding(true);

    const seedCompanies = [
      { name: "Sentra Cyber", sector: "Cyber", alias: "Security Architect", options: 96_000, strike: 1.42 },
      { name: "Nexa Generative AI", sector: "AI/ML", alias: "LLM Platform Lead", options: 120_000, strike: 1.12 },
      { name: "Orion Cloud SaaS", sector: "SaaS", alias: "Growth Engineering Director", options: 84_000, strike: 0.76 },
    ];

    for (const seed of seedCompanies) {
      const analysis = buildAutonomousUnderwritingReport(seed.name);
      const companyRecord = await upsertCompanyProfile({
        company_name: analysis.companyName,
        sector: analysis.sector,
        sub_industry: analysis.subIndustry,
        funding_stage: analysis.fundingStage,
        fmv: analysis.fmv,
        p_exit: analysis.pExit,
        institutional_risk_score: analysis.institutionalRiskScore,
        exit_scenarios: analysis.scenarios,
        logo_url: analysis.companyLogoUrl,
        one_liner: analysis.companyOneLiner,
        ai_sources: analysis.provenance.dataSources,
        legal_profile: analysis.legalProfile,
        risk_rating: analysis.riskRating,
        confidence: analysis.confidence,
        source: "live",
      });

      await insertOptionGrant({
        company_id: companyRecord?.id,
        company_name: seed.name,
        employee_alias: seed.alias,
        option_count: seed.options,
        strike_price: seed.strike,
        exercise_cost: Math.round(seed.options * seed.strike),
        tax_route: "Section 102 trustee route",
        status: "pending_underwriting",
      });
    }

    setActivityMessage("Seeded 3 Israeli high-growth test grants into the deal queue.");
    setIsSeeding(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="rounded-[36px] border border-[#E8E4DC] bg-[#F9F6EE] px-6 py-8 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0C3B2E]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0C3B2E]" /> Admin control room
            </div>
            <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-[#0C3B2E]">Back-office underwriting, approval, and LOI operations.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5A5A58]">Every submission, approval, and allocation is now sourced from Supabase and pushed to the marketplace in realtime.</p>
          </div>
          <Link href="/" className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
            Back to gatekeeper
          </Link>
          <button
            onClick={seedTestData}
            disabled={isSeeding}
            className="rounded-full border border-[#0C3B2E]/30 bg-[#F0ECE1] px-6 py-4 text-sm font-semibold text-[#0C3B2E] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSeeding ? "Seeding..." : "Seed Test Data"}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {activityMessage && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
            {activityMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Volume", value: formatCurrency(totalVolume), icon: <Wallet className="h-4 w-4" /> },
          { label: "Live Deals", value: liveGrantCount.toString(), icon: <ShieldCheck className="h-4 w-4" /> },
          { label: "Average Pexit", value: `${averagePexit}%`, icon: <TimerReset className="h-4 w-4" /> },
          { label: "Signed LOIs", value: signedLoiCount.toString(), icon: <Signature className="h-4 w-4" /> },
        ].map((metric) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-[#E8E4DC] bg-white/80 p-5 shadow-[0_20px_80px_rgba(12,59,46,0.06)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">{metric.label}</p>
            <div className="mt-3 flex items-center gap-2">
              <p className="font-serif text-2xl font-bold text-[#0C3B2E]">{metric.value}</p>
              <span className="text-[#0C3B2E]">{metric.icon}</span>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Automated Deal Queue</p>
            <h2 className="mt-1 font-serif text-2xl text-[#0C3B2E]">AI-underwritten grant submissions ready for decisioning</h2>
          </div>
          <p className="text-sm text-[#5A5A58]">Conversion rate: {conversionRate}% · View: {devRole}</p>
        </div>

        <div className="space-y-4">
          {visibleDealQueue.map((deal) => {
            const badge = statusBadgeConfig[deal.grant.status];
            const isSelected = selectedGrantId === deal.grant.id;

            return (
              <motion.article
                key={deal.grant.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-2xl text-[#0C3B2E]">{deal.grant.company_name}</h3>
                      <span className={`rounded-full border ${badge.border} ${badge.bg} px-3 py-1 text-xs font-semibold ${badge.text}`}>{badge.label}</span>
                      {deal.company && <span className="rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-3 py-1 text-xs font-semibold text-[#0C3B2E]">{deal.company.sector}</span>}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#5A5A58]">{deal.analysis.companyOneLiner}</p>
                    <div className="mt-4 grid gap-3 text-sm text-[#5A5A58] sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Employee alias</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{deal.grant.employee_alias}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Option count</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{deal.grant.option_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Exercise cost</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{formatCurrency(deal.grant.exercise_cost)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Tax route</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{deal.grant.tax_route}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-3 py-1 text-xs font-medium text-[#5A5A58]">
                        FMV <span className="font-semibold text-[#0C3B2E]">{formatCurrency(deal.analysis.fmv)}</span>
                      </span>
                      <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-3 py-1 text-xs font-medium text-[#5A5A58]">
                        Pexit <span className="font-semibold text-[#0C3B2E]">{deal.analysis.pExit}%</span>
                      </span>
                      <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-3 py-1 text-xs font-medium text-[#5A5A58]">
                        Institutional risk <span className="font-semibold text-[#0C3B2E]">{deal.analysis.institutionalRiskScore}</span>
                      </span>
                      <span className="rounded-full border border-[#E8E4DC] bg-[#F9F6EE] px-3 py-1 text-xs font-medium text-[#5A5A58]">
                        Funding stage <span className="font-semibold text-[#0C3B2E]">{deal.analysis.fundingStage}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <button
                      onClick={() => transitionGrantStatus(deal.grant.id, "live", `Published ${deal.grant.company_name} to the marketplace.`)}
                      disabled={updatingGrantId === deal.grant.id}
                      className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {updatingGrantId === deal.grant.id ? "Publishing..." : "Approve & Publish to Marketplace"}
                    </button>
                    <button
                      onClick={() => transitionGrantStatus(deal.grant.id, "approved", `Flagged ${deal.grant.company_name} for review.`)}
                      disabled={updatingGrantId === deal.grant.id}
                      className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Flag for Review
                    </button>
                    <button
                      onClick={() => setSelectedGrantId(isSelected ? null : deal.grant.id)}
                      className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white"
                    >
                      {isSelected ? "Hide Details" : "View AI Dossier"} <ChevronRight className="ml-1 inline h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}

          {visibleDealQueue.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[32px] border border-dashed border-[#E2DDD0] bg-[#F9F6EE] p-10 text-center text-sm text-[#5A5A58]">
              <p className="font-serif text-2xl text-[#0C3B2E]">No submissions in this queue view.</p>
              <p className="mt-2">Seed test grants or switch role mode to inspect another operational slice.</p>
            </motion.div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Live Allocation & LOI Log</p>
            <h2 className="mt-1 font-serif text-2xl text-[#0C3B2E]">Signed investor intent and matching status</h2>
          </div>
          <p className="text-sm text-[#5A5A58]">Allocation count: {visibleAllocations.length}</p>
        </div>

        <div className="space-y-4">
          {visibleAllocations.map((allocation) => {
            const badge = allocationBadgeConfig[allocation.status];
            const matchingDeal = dealQueue.find((item) => item.grant.id === allocation.grant_id);

            return (
              <motion.article
                key={allocation.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-xl text-[#0C3B2E]">{allocation.investor_firm}</h3>
                      <span className={`rounded-full border ${badge.border} ${badge.bg} px-3 py-1 text-xs font-semibold ${badge.text}`}>{badge.label}</span>
                      {allocation.signed_loi && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">LOI Signed</span>}
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-[#5A5A58] sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Target grant</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{matchingDeal?.grant.company_name || allocation.grant_id}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Committed amount</span>
                        <p className="mt-1 font-medium text-[#0C3B2E]">{formatCurrency(allocation.committed_amount)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Digital signature</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{allocation.signature_name || "Pending"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Status</span>
                        <p className="mt-1 font-medium text-[#1A1A1A]">{allocation.status}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <button
                      onClick={() => transitionAllocationStatus(allocation.id, "approved", `Allocation from ${allocation.investor_firm} approved.`)}
                      disabled={updatingAllocationId === allocation.id}
                      className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {updatingAllocationId === allocation.id ? "Updating..." : "Approve"}
                    </button>
                    <button
                      onClick={() => transitionAllocationStatus(allocation.id, "settled", `Allocation from ${allocation.investor_firm} settled.`)}
                      disabled={updatingAllocationId === allocation.id}
                      className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Mark Settled
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}

          {visibleAllocations.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#E2DDD0] bg-[#F9F6EE] p-6 text-sm text-[#5A5A58]">
              No live allocations yet. As soon as an investor signs an LOI, the record will stream in here.
            </div>
          )}
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-[85] w-[330px] rounded-[24px] border border-[#E8E4DC] bg-[#FBF9F5]/95 p-4 shadow-[0_18px_60px_rgba(12,59,46,0.12)] backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">DevTools Overlay</p>
        <p className="mt-1 text-xs text-[#5A5A58]">Switch role perspective instantly for end-to-end QA.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { role: "employee", label: "View as Employee" },
            { role: "investor", label: "View as Accredited Investor" },
            { role: "admin", label: "View as Platform Admin" },
          ].map((item) => (
            <button
              key={item.role}
              onClick={() => switchRole(item.role as DevRole)}
              className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] transition ${
                devRole === item.role
                  ? "border-[#0C3B2E] bg-[#0C3B2E] text-white"
                  : "border-[#E0DCD3] bg-white text-[#5A5A58] hover:text-[#0C3B2E]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {selectedDeal && (
        <section className="grid gap-4 rounded-[32px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)] lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Selected underwriting dossier</p>
            <div className="mt-3 flex items-start gap-4">
              <img
                src={selectedDeal.analysis.companyLogoUrl}
                alt={selectedDeal.grant.company_name}
                className="h-14 w-14 rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] object-cover"
              />
              <div>
                <h3 className="font-serif text-3xl text-[#0C3B2E]">{selectedDeal.grant.company_name}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5A5A58]">{selectedDeal.analysis.companyOneLiner}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {selectedDeal.analysis.scenarios.map((scenario) => (
                <div key={scenario.label} className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#5A5A58]">{scenario.label}</p>
                  <p className="mt-2 font-serif text-xl text-[#0C3B2E]">{formatCurrency(scenario.valuationUsd)}</p>
                  <p className="mt-1 text-sm text-[#5A5A58]">ROI {scenario.estimatedRoi}% · IRR {scenario.estimatedIrr}%</p>
                  <p className="mt-1 text-xs text-[#5A5A58]">Liquidity horizon {scenario.liquidityTimelineMonths} months</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-[#1A1A1A]">Legal extraction</h4>
                <CircleAlert className="h-4 w-4 text-[#0C3B2E]" />
              </div>
              <div className="mt-3 space-y-2 text-sm text-[#5A5A58]">
                <p>Vesting: {selectedDeal.analysis.legalProfile.vestingStatus}</p>
                <p>Section 102: {selectedDeal.analysis.legalProfile.section102Route}</p>
                <p>Transfer restrictions: {selectedDeal.analysis.legalProfile.transferRestrictions}</p>
                <p>ROFR badge: {selectedDeal.analysis.legalProfile.rofrBadge}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4">
              <h4 className="font-semibold text-[#1A1A1A]">AI data provenance</h4>
              <div className="mt-3 space-y-2">
                {selectedDeal.analysis.provenance.dataSources.map((source) => (
                  <a key={source.label} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-white/80 px-3 py-3 text-sm text-[#5A5A58] transition hover:border-[#0C3B2E]/40 hover:bg-[#F0ECE1] hover:text-[#0C3B2E]">
                    <span>
                      {source.label}
                      <span className="mt-0.5 block text-[11px] text-[#8A8A84]">{source.note}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4">
              <h4 className="font-semibold text-[#1A1A1A]">Execution summary</h4>
              <div className="mt-3 grid gap-2 text-sm text-[#5A5A58]">
                <p>Pexit: {selectedDeal.analysis.pExit}%</p>
                <p>Institutional risk score: {selectedDeal.analysis.institutionalRiskScore}</p>
                <p>Funding stage: {selectedDeal.analysis.fundingStage}</p>
                <p>Confidence: {selectedDeal.analysis.confidence}%</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}