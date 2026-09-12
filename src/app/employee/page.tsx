"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { analyzeCompanyLive } from "@/lib/ai-underwriter";
import { insertOptionGrant, upsertCompanyProfile } from "@/lib/supabase";
import { calculateSection102Tax } from "@/lib/tax-calculator";
import AgreementPreviewModal from "@/components/agreement-preview-modal";

const EMPLOYEE_DRAFT_KEY = "strike:employee-draft-v1";

const findings = [
  {
    title: "ROFR detected",
    value: "Right of first refusal clause identified in Section 12.1.",
    status: "Matched",
  },
  {
    title: "90-day expiry warning",
    value: "Exercise window is set to close in 11 days.",
    status: "Monitor",
  },
  {
    title: "Section 102 status",
    value: "Eligible for Israeli tax treatment with documentation attached.",
    status: "Ready",
  },
];

export default function EmployeePage() {
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(0);
  const [grant, setGrant] = useState({
    company: "Northstar Labs",
    options: "240,000",
    strike: "0.84",
    grantDateFmv: "1.10",
    fmv: "3.20",
  });
  const [taxEligible, setTaxEligible] = useState(true);
  const [applySurtax, setApplySurtax] = useState(false);
  const [status, setStatus] = useState("Drafting your intake");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [legalFindings, setLegalFindings] = useState(findings);
  const [isSyncingCapTable, setIsSyncingCapTable] = useState(false);
  const [capTableSynced, setCapTableSynced] = useState(false);
  const [selectedCapTableSource, setSelectedCapTableSource] = useState<"Carta" | "Pulley" | "Shareworks" | null>(null);
  const [isAgreementPreviewOpen, setIsAgreementPreviewOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);

  const pushToast = (message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  };

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(EMPLOYEE_DRAFT_KEY);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as {
        step: number;
        grant: typeof grant;
        taxEligible: boolean;
        applySurtax: boolean;
      };

      if (draft.grant) setGrant(draft.grant);
      setTaxEligible(Boolean(draft.taxEligible));
      setApplySurtax(Boolean(draft.applySurtax));
      setStep(Math.min(2, Math.max(0, Number(draft.step || 0))));
      setStatus("Draft restored from your last session");
      pushToast("Draft restored");
    } catch {
      window.localStorage.removeItem(EMPLOYEE_DRAFT_KEY);
    }
  }, []);

  const saveDraft = () => {
    window.localStorage.setItem(
      EMPLOYEE_DRAFT_KEY,
      JSON.stringify({
        step,
        grant,
        taxEligible,
        applySurtax,
      })
    );
    pushToast("Progress saved to draft");
  };

  const handleDocumentUpload = () => {
    // Simulate legal document parsing
    setUploadedFile("Option_Grant_Agreement_2024.pdf");
    setStatus("Scanning legal agreement...");
    
    setTimeout(() => {
      // Simulate extraction results
      setLegalFindings([
        {
          title: "Vesting Schedule Identified",
          value: "4-year vesting with 1-year cliff. 180,000 shares vested, 60,000 remaining.",
          status: "Verified",
        },
        {
          title: "ROFR & Transfer Restrictions",
          value: "Company holds Right of First Refusal on secondary sale. No free tradeable window until IPO.",
          status: "Warning",
        },
        {
          title: "Section 102 Status",
          value: "Plan qualifies under Israeli Section 102. Capital gains treatment on appreciation, ordinary income on exercise cost.",
          status: "Ready",
        },
      ]);
      setStatus("Legal analysis complete ✓");
    }, 800);
  };

  const handleCapTableSync = async (source: "Carta" | "Pulley" | "Shareworks") => {
    setIsSyncingCapTable(true);
    setSelectedCapTableSource(source);
    setStatus(`Syncing with ${source}...`);

    // Simulate API call
    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    // Simulate fetching cap table data
    const syntheticData = {
      Carta: {
        options: "240,000",
        strike: "0.84",
        grantDateFmv: "1.10",
        fmv: "3.20",
        vestingProgress: 75,
      },
      Pulley: {
        options: "240,000",
        strike: "0.84",
        grantDateFmv: "1.10",
        fmv: "3.20",
        vestingProgress: 75,
      },
      Shareworks: {
        options: "240,000",
        strike: "0.84",
        grantDateFmv: "1.10",
        fmv: "3.20",
        vestingProgress: 75,
      },
    };

    const data = syntheticData[source];
    setGrant((current) => ({
      ...current,
      options: data.options,
      strike: data.strike,
      grantDateFmv: data.grantDateFmv,
      fmv: data.fmv,
    }));

    setCapTableSynced(true);
    setStatus(`✓ Cap table synced with ${source}`);
    setIsSyncingCapTable(false);
  };

  const optionsCount = Number(grant.options.replace(/,/g, ""));
  const strikePrice = Number(grant.strike);
  const grantDateFmv = Number(grant.grantDateFmv);
  const currentSecondaryPrice = Number(grant.fmv);
  const section102 = calculateSection102Tax({
    optionCount: optionsCount,
    strikePrice,
    grantDateFmv,
    currentSecondaryPrice,
    section102CapitalGainsTrack: taxEligible,
    applySurtax,
  });
  const exerciseCost = optionsCount * strikePrice;
  const grossValue = section102.grossProceeds;
  const tax = section102.totalTax;
  const strikeProfitShare = Math.max(0, grossValue - exerciseCost - tax) * 0.2;
  const netToBank = Math.max(0, grossValue - exerciseCost - tax - strikeProfitShare);

  const waterfallItems = useMemo(() => {
    const dynamicTaxRows = section102.regime === "section102_capital_gains"
      ? [
          {
            label: section102.splitApplied ? "Work income tax" : "Capital gains tax",
            value: -(section102.splitApplied ? section102.workIncomeTax : section102.capitalGainsTax),
            positive: false,
          },
          ...(section102.splitApplied
            ? [{ label: "Capital gains tax", value: -section102.capitalGainsTax, positive: false }]
            : []),
        ]
      : [{ label: "Ordinary income tax", value: -section102.ordinaryIncomeTax, positive: false }];

    if (section102.surtaxTax > 0) {
      dynamicTaxRows.push({ label: "Surtax (3%)", value: -section102.surtaxTax, positive: false });
    }

    return [
      { label: "Gross value", value: grossValue, positive: true },
      { label: "Exercise cost", value: -exerciseCost, positive: false },
      ...dynamicTaxRows,
      { label: "Strike profit share", value: -strikeProfitShare, positive: false },
      { label: "Net-to-bank", value: netToBank, positive: true },
    ];
  }, [exerciseCost, grossValue, netToBank, section102, strikeProfitShare]);

  const maxBar = 6_000_000;
  const steps = ["Grant details", "AI review", "Net-to-bank"];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setStatus("Analyzing company profile...");

    const analysis = await analyzeCompanyLive(grant.company);
    const estimatedFmv = Number(grant.fmv);

    const companyRecord = await upsertCompanyProfile({
      company_name: analysis.companyName,
      sector: analysis.sector,
      sub_industry: analysis.subIndustry,
      funding_stage: analysis.fundingStage,
      fmv: analysis.pExit > 0 ? analysis.scenarios[1].valuationUsd : estimatedFmv,
      p_exit: analysis.pExit,
      institutional_risk_score: analysis.institutionalRiskScore,
      exit_scenarios: analysis.scenarios,
      logo_url: analysis.companyLogoUrl,
      one_liner: analysis.companyOneLiner,
      ai_sources: analysis.provenance.dataSources,
      legal_profile: analysis.legalProfile,
      risk_rating: analysis.riskRating,
      confidence: analysis.confidence,
      source: analysis.source,
    });

    await insertOptionGrant({
      company_id: companyRecord?.id,
      company_name: analysis.companyName,
      employee_alias: `${analysis.companyName} employee holder`,
      option_count: optionsCount || 0,
      strike_price: strikePrice || 0,
      exercise_cost: exerciseCost || 0,
      tax_route: analysis.legalProfile.section102Route,
      status: "pending_underwriting",
    });

    setStatus(`Live underwriting broadcasted for ${analysis.companyName}`);
    setIsSubmitting(false);
    setStep(2);
    window.localStorage.removeItem(EMPLOYEE_DRAFT_KEY);
    pushToast("Grant submitted to marketplace queue");
  };

  return (
    <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),radial-gradient(circle_at_90%_0%,_rgba(16,185,129,0.12),_transparent_24%)]" />
      <header className="rounded-[36px] border border-slate-800/70 bg-slate-900/60 px-6 py-7 shadow-[0_0_90px_rgba(2,6,23,0.75)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Employee cockpit</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Financial execution designed to feel premium and instant.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Navigate your grant, review legal signals, and simulate your final proceeds in a richer, high-conviction workspace.</p>
          </div>
          <Link href="/" className="rounded-full bg-gradient-to-r from-indigo-600 to-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-500 hover:to-slate-700">
            Back to gatekeeper
          </Link>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[0.98fr_1.02fr]">
        <div className="rounded-[32px] border border-slate-800/70 bg-slate-900/60 p-8 shadow-[0_0_100px_rgba(2,6,23,0.65)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-center gap-3">
            {steps.map((item, index) => (
              <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#86868B]">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= index ? "bg-[#0F172A] text-white" : "bg-white/80 text-[#86868B]"}`}>
                  {index + 1}
                </div>
                <span className={step >= index ? "text-[#1D1D1F]" : ""}>{item}</span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="grant" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mt-8 space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#0C3B2E]">Option grant details</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5A5A58]">Capture the grant structure and upload the documents that support the liquidity request. These inputs are locked once you advance into the simulator.</p>
                </div>

                {/* ── Cap Table Sync Widget ── */}
                <div className="rounded-[28px] border-2 border-emerald-300 bg-emerald-50 p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Official Cap-Table Verified</p>
                      <h3 className="mt-2 font-serif text-lg text-[#0C3B2E]">One-click sync with your cap table</h3>
                      <p className="mt-1 text-xs leading-5 text-[#5A5A58]">Pull exact grant units, strike price, and vesting progress directly from your ESOP provider</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Carta", "Pulley", "Shareworks"].map((provider) => (
                        <button
                          key={provider}
                          onClick={() => handleCapTableSync(provider as "Carta" | "Pulley" | "Shareworks")}
                          disabled={isSyncingCapTable}
                          className="whitespace-nowrap rounded-full border border-emerald-400 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 transition-all duration-300 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {isSyncingCapTable && selectedCapTableSource === provider ? "Syncing..." : provider}
                        </button>
                      ))}
                    </div>
                  </div>
                  {capTableSynced && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2">
                      <span className="text-xs font-semibold text-emerald-700">✓ Data auto-populated from {selectedCapTableSource}</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Company name", value: grant.company, field: "company", type: "text" },
                    { label: "Number of options", value: grant.options, field: "options", type: "text" },
                    { label: "Strike price", value: grant.strike, field: "strike", type: "text" },
                    { label: "Grant date FMV", value: grant.grantDateFmv, field: "grantDateFmv", type: "text" },
                    { label: "Current secondary price", value: grant.fmv, field: "fmv", type: "text" },
                  ].map((field) => (
                    <label key={field.label} className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 text-sm text-[#5A5A58] shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                      <span className="mb-2 block font-semibold text-[#1A1A1A]">{field.label}</span>
                      <input value={field.value} onChange={(event) => setGrant((current) => ({ ...current, [field.field]: event.target.value }))} className="w-full border-0 bg-transparent text-sm outline-none text-[#1A1A1A]" />
                    </label>
                  ))}
                </div>

                <label className="flex items-center justify-between rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 text-sm text-[#5A5A58] shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">Israeli Section 102 tax eligibility</p>
                    <p className="mt-1 text-[#5A5A58]">This assumption is locked for the remainder of the simulation.</p>
                  </div>
                  <input type="checkbox" checked={taxEligible} onChange={() => setTaxEligible((current) => !current)} className="h-5 w-5 accent-[#0C3B2E]" />
                </label>

                <label className="flex items-center justify-between rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 text-sm text-[#5A5A58] shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">Apply surtax (3%) for high earners</p>
                    <p className="mt-1 text-[#5A5A58]">מס יסף is applied to taxable gain when this toggle is enabled.</p>
                  </div>
                  <input type="checkbox" checked={applySurtax} onChange={() => setApplySurtax((current) => !current)} className="h-5 w-5 accent-[#0C3B2E]" />
                </label>

                <div className="rounded-[24px] border border-dashed border-[#E2DDD0] bg-[#F9F6EE] p-6 text-sm text-[#5A5A58]">
                  <p className="font-semibold text-[#1A1A1A]">Upload option grant PDF</p>
                  <p className="mt-2">Grant letter, award notice, and exercise confirmation are parsed instantly.</p>
                  <button
                    onClick={handleDocumentUpload}
                    className="mt-4 rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                  >
                    {uploadedFile ? `✓ ${uploadedFile}` : "Select document"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="review" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mt-8 space-y-5">
                <div>
                  <h2 className="font-serif text-2xl text-[#0C3B2E]">Legal Tech AI findings</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5A5A58]">The simulator surfaces clauses and timing issues that materially affect your execution window.</p>
                  <button
                    onClick={() => setIsAgreementPreviewOpen(true)}
                    className="mt-4 rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#1A1A1A] transition hover:bg-white"
                  >
                    View Draft Agreements
                  </button>
                </div>

                {legalFindings.map((item, index) => (
                  <motion.div key={item.title} layout className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                    <button onClick={() => setExpanded(index === expanded ? -1 : index)} className="flex w-full items-center justify-between text-left">
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{item.title}</p>
                        <p className="mt-1 text-sm text-[#5A5A58]">{item.value}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${
                        item.status === "Verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "Warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-[#F0ECE1] text-[#0C3B2E]"
                      }`}>{item.status}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded === index && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <p className="mt-3 text-sm leading-7 text-[#5A5A58]">This item is flagged for review by the legal operations desk and surfaced pre-emptively in the liquidity flow.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="cash" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mt-8 space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#0C3B2E]">Net-to-bank cockpit</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5A5A58]">Adjust current secondary pricing to see the full Section 102 split-tax waterfall in real time.</p>
                </div>

                <div className="space-y-5 rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-5 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <label className="block text-sm text-[#4B4B50]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-[#1D1D1F]">Current Secondary Price Per Option</span>
                      <span className="text-[#1D1D1F]">${currentSecondaryPrice.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="0.1"
                      value={Number.isFinite(currentSecondaryPrice) ? currentSecondaryPrice : 0}
                      onChange={(event) => setGrant((current) => ({ ...current, fmv: Number(event.target.value).toFixed(2) }))}
                      className="w-full accent-[#0C3B2E]"
                    />
                  </label>

                  <div className="rounded-[20px] border border-[#E8E4DC] bg-white/80 p-4 text-sm text-[#5A5A58]">
                    <div className="flex items-center justify-between">
                      <span>Fixed exercise cost</span>
                      <span className="font-semibold text-[#1D1D1F]">${exerciseCost.toLocaleString()}</span>
                    </div>
                    {section102.workIncomeComponent > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <span>Work income component</span>
                        <span className="font-semibold text-[#1D1D1F]">${section102.workIncomeComponent.toLocaleString()}</span>
                      </div>
                    )}
                    {section102.capitalGainComponent > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <span>Capital gain component</span>
                        <span className="font-semibold text-[#1D1D1F]">${section102.capitalGainComponent.toLocaleString()}</span>
                      </div>
                    )}
                    {section102.ordinaryIncomeComponent > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <span>Ordinary income component</span>
                        <span className="font-semibold text-[#1D1D1F]">${section102.ordinaryIncomeComponent.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span>Work income tax</span>
                      <span className="font-semibold text-[#1D1D1F]">${section102.workIncomeTax.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Capital gains tax</span>
                      <span className="font-semibold text-[#1D1D1F]">${section102.capitalGainsTax.toLocaleString()}</span>
                    </div>
                    {section102.ordinaryIncomeTax > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <span>Ordinary income tax</span>
                        <span className="font-semibold text-[#1D1D1F]">${section102.ordinaryIncomeTax.toLocaleString()}</span>
                      </div>
                    )}
                    {section102.surtaxTax > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <span>Surtax (3%)</span>
                        <span className="font-semibold text-[#1D1D1F]">${section102.surtaxTax.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span>Total tax</span>
                      <span className="font-semibold text-[#1D1D1F]">${tax.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Strike profit share</span>
                      <span className="font-semibold text-[#1D1D1F]">${strikeProfitShare.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#E8E4DC] bg-white/80 p-5 text-[#1A1A1A] shadow-[0_20px_50px_rgba(12,59,46,0.04)]">
                  <div className="flex items-end justify-between gap-3">
                    {waterfallItems.map((item) => {
                      const height = Math.max(16, Math.abs(item.value) / maxBar * 100);
                      return (
                        <div key={item.label} className="flex flex-1 flex-col items-center">
                          <div className={`w-full rounded-t-[16px] ${item.positive ? "bg-gradient-to-t from-indigo-500 to-slate-100" : "bg-gradient-to-t from-rose-600 to-rose-200"}`} style={{ height: `${Math.min(100, height)}%` }} />
                          <div className="mt-3 text-center text-[11px] uppercase tracking-[0.25em] text-[#5A5A58]">{item.label}</div>
                          <div className="mt-1 text-sm font-semibold text-[#0C3B2E]">${Math.abs(item.value).toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── Decision Matrix: Self-Funded vs Strike ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-8 rounded-[32px] border border-[#E8E4DC] bg-gradient-to-br from-white/90 to-[#F9F6EE] p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)]"
                >
                  <div className="mb-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Decision matrix</p>
                    <h3 className="mt-2 font-serif text-2xl text-[#0C3B2E]">Self-Funded Exercise vs Strike Secondary Liquidity</h3>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {/* ─── Left: Self-Funded Exercise ─── */}
                    <div className="rounded-[24px] border-2 border-rose-200 bg-rose-50/50 p-6">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <h4 className="font-serif text-lg text-[#1A1A1A]">Self-Funded Exercise</h4>
                        <span className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700">
                          ⚠️ High Risk
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[16px] border border-rose-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Out-of-pocket today</p>
                          <p className="mt-2 font-serif text-2xl font-bold text-rose-700">
                            ${(exerciseCost + tax).toLocaleString()}
                          </p>
                          <p className="mt-1 text-[11px] text-[#5A5A58]">
                            {exerciseCost.toLocaleString()} (exercise) + {tax.toLocaleString()} (tax)
                          </p>
                        </div>

                        <div className="rounded-[16px] border border-rose-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Capital at risk</p>
                          <p className="mt-2 font-serif text-xl font-bold text-rose-700">100% of savings</p>
                          <p className="mt-1 text-[11px] text-[#5A5A58]">
                            Entire investment locked in illiquid shares
                          </p>
                        </div>

                        <div className="rounded-[16px] border border-rose-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Upside exposure</p>
                          <p className="mt-2 text-sm font-semibold text-[#1A1A1A]">
                            Full upside, but illiquid for 3–5+ years
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ─── Right: Strike Secondary ─── */}
                    <div className="rounded-[24px] border-2 border-emerald-200 bg-emerald-50/50 p-6">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <h4 className="font-serif text-lg text-[#1A1A1A]">Strike Secondary Liquidity</h4>
                        <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                          ✓ Zero risk
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[16px] border border-emerald-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Out-of-pocket today</p>
                          <p className="mt-2 font-serif text-2xl font-bold text-emerald-700">$0</p>
                          <p className="mt-1 text-[11px] text-[#5A5A58]">
                            Funded 100% by accredited investors
                          </p>
                        </div>

                        <div className="rounded-[16px] border border-emerald-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Capital at risk</p>
                          <p className="mt-2 font-serif text-xl font-bold text-emerald-700">$0</p>
                          <p className="mt-1 text-[11px] text-[#5A5A58]">
                            No personal capital deployed
                          </p>
                        </div>

                        <div className="rounded-[16px] border border-emerald-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#5A5A58]">Net-to-bank proceeds</p>
                          <p className="mt-2 font-serif text-2xl font-bold text-[#0C3B2E]">
                            ${netToBank.toLocaleString()}
                          </p>
                          <p className="mt-1 text-[11px] text-[#5A5A58]">
                            Liquid cash in 30–90 days
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── AI Recommendation ─── */}
                  <div className="mt-6 rounded-[24px] border border-[#0C3B2E]/20 bg-[#F0ECE1] p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xl">🧠</span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0C3B2E]">AI Recommendation</p>
                        <p className="mt-2 text-sm leading-6 text-[#1A1A1A]">
                          Based on your ${optionsCount.toLocaleString()} option grant and {taxEligible ? "Section 102 tax treatment" : "standard tax treatment"}, 
                          <span className="font-semibold"> Strike Secondary Liquidity is the optimal path</span>. You unlock ${netToBank.toLocaleString()} 
                          in {grossValue > 6_000_000 ? "near-term" : "medium-term"} cash proceeds without risking personal capital, 
                          versus locking {(exerciseCost + tax).toLocaleString()} of your own funds in illiquid shares.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setStep((current) => Math.max(0, current - 1))} className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={saveDraft}
                className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
              >
                Save Progress / Draft
              </button>
              <span className="text-sm font-medium text-[#86868B]">{status}</span>
              <button onClick={() => (step === steps.length - 1 ? handleSubmit() : setStep((current) => Math.min(steps.length - 1, current + 1)))} className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F] disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : step === steps.length - 1 ? "Submit & broadcast" : "Next"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-[#E8E4DC] bg-[#F9F6EE] p-8 text-[#1A1A1A] shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Live preview</p>
          <div className="mt-4 font-serif text-5xl text-[#0C3B2E]">${netToBank.toLocaleString()}</div>
          <p className="mt-3 text-sm leading-7 text-[#5A5A58]">Projected net-to-bank amount after your current exercise assumptions and Israeli Section 102 treatment.</p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-[20px] border border-[#E8E4DC] bg-white/80 p-4">
              <div className="flex items-center justify-between text-sm text-[#5A5A58]">
                <span>Gross secondary proceeds</span>
                <span className="font-semibold text-[#1A1A1A]">${grossValue.toLocaleString()}</span>
              </div>
            </div>
            <div className="rounded-[20px] border border-[#E8E4DC] bg-white/80 p-4">
              <div className="flex items-center justify-between text-sm text-[#5A5A58]">
                <span>Total estimated tax</span>
                <span className="font-semibold text-[#1A1A1A]">${tax.toLocaleString()}</span>
              </div>
            </div>
            <div className="rounded-[20px] border border-[#E8E4DC] bg-white/80 p-4">
              <div className="flex items-center justify-between text-sm text-[#5A5A58]">
                <span>Strike profit share</span>
                <span className="font-semibold text-[#1A1A1A]">${strikeProfitShare.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AgreementPreviewModal
        isOpen={isAgreementPreviewOpen}
        onClose={() => setIsAgreementPreviewOpen(false)}
        mode="employee"
        data={{
          employeeName: "Employee Holder",
          companyName: grant.company,
          optionCount: optionsCount || 0,
          strikePrice,
          estimatedNetProceeds: netToBank,
          commitmentAmount: grossValue,
          investorFirmName: "Strike Network",
          targetCompanyAlias: grant.company,
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
