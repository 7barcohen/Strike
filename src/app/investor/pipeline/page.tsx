"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { evaluateStartup } from "@/lib/ai-underwriter";

const deals = [
  {
    name: "Cyber Unicorn",
    stage: "Series D",
    metrics: {
      hiringVelocity: 11,
      investorTier: "tier-1" as const,
      marketSentiment: 0.82,
      runwayMonths: 24,
      revenueSignal: 81,
    },
  },
  {
    name: "Sovereign AI",
    stage: "Series B",
    metrics: {
      hiringVelocity: 7,
      investorTier: "tier-2" as const,
      marketSentiment: 0.64,
      runwayMonths: 16,
      revenueSignal: 58,
    },
  },
  {
    name: "Northstar Fintech",
    stage: "Growth",
    metrics: {
      hiringVelocity: 6,
      investorTier: "tier-3" as const,
      marketSentiment: 0.51,
      runwayMonths: 18,
      revenueSignal: 48,
    },
  },
];

export default function InvestorPipelinePage() {
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [allocated, setAllocated] = useState<string[]>([]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-4 rounded-[36px] border border-[#E8E4DC] bg-[#F9F6EE] px-6 py-7 shadow-[0_20px_80px_rgba(12,59,46,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0C3B2E]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0C3B2E]" /> Investor pipeline
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-[#0C3B2E]">Anonymous, high-intent startup opportunities</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/investor" className="rounded-full border border-[#E0DCD3] bg-white/90 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
            Back to marketplace
          </Link>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-2">
        {deals.map((deal) => {
          const result = evaluateStartup(deal.metrics);
          return (
            <motion.article key={deal.name} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-7 shadow-[0_20px_80px_rgba(12,59,46,0.06)] transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">{deal.stage}</p>
                  <h2 className="mt-2 font-serif text-2xl text-[#0C3B2E]">{deal.name}</h2>
                </div>
                <button onClick={() => setSelectedDeal(deal.name)} className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
                  Request allocation
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">Pexit</p>
                  <p className="mt-1 font-serif text-3xl text-[#0C3B2E]">{result.pExit}%</p>
                </div>
                <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">FMV</p>
                  <p className="mt-1 font-serif text-3xl text-[#0C3B2E]">${(result.fmv / 1000000).toFixed(1)}M</p>
                </div>
                <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">Risk rating</p>
                  <p className="mt-1 text-2xl font-semibold text-[#1A1A1A]">{result.riskRating}</p>
                </div>
                <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">Confidence</p>
                  <p className="mt-1 text-2xl font-semibold text-[#1A1A1A]">{result.confidenceScore}%</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#5A5A58]">{result.summary}</p>

              {allocated.includes(deal.name) && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Allocation request submitted for {deal.name}.
                </div>
              )}
            </motion.article>
          );
        })}
      </section>

      <AnimatePresence>
        {selectedDeal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-md rounded-[32px] border border-[#E8E4DC] bg-white/90 p-7 shadow-[0_30px_120px_rgba(12,59,46,0.16)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Allocation lock</p>
                  <h3 className="mt-2 font-serif text-xl text-[#0C3B2E]">Request allocation for {selectedDeal}</h3>
                </div>
                <button onClick={() => setSelectedDeal(null)} className="rounded-full border border-[#E0DCD3] bg-white/80 px-3 py-2 text-sm font-semibold text-[#1A1A1A]">
                  Close
                </button>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#5A5A58]">Submit your intent to reserve a position in this opportunity and receive a note from the Strike underwriting desk.</p>
              <div className="mt-6 space-y-3">
                <label className="block text-sm text-[#5A5A58]">
                  <span className="mb-2 block font-medium text-[#1A1A1A]">Allocation amount</span>
                  <input defaultValue="$250k" className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 outline-none text-[#1A1A1A] shadow-[0_10px_30px_rgba(12,59,46,0.03)]" />
                </label>
                <label className="block text-sm text-[#5A5A58]">
                  <span className="mb-2 block font-medium text-[#1A1A1A]">Note</span>
                  <textarea defaultValue="Interested in participating alongside the current syndicate." className="min-h-24 w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 outline-none text-[#1A1A1A] shadow-[0_10px_30px_rgba(12,59,46,0.03)]" />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSelectedDeal(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Cancel</button>
                <button onClick={() => { setAllocated((current) => (selectedDeal ? [...current, selectedDeal] : current)); setSelectedDeal(null); }} className="rounded-full bg-[#0C3B2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F]">Submit request</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
