"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { loadPortfolioState, savePortfolioState, type PortfolioState } from "@/lib/investor-storage";

const tabs = ["saved", "pending", "active"] as const;

export default function InvestorPortfolioPage() {
  const [state, setState] = useState<PortfolioState>(loadPortfolioState());
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("saved");
  const [relistingItem, setRelistingItem] = useState<any>(null);
  const [relistingPricing, setRelistingPricing] = useState<number>(0); // -50 to +50 discount/premium percentage

  useEffect(() => {
    setState(loadPortfolioState());
  }, []);

  const items = useMemo(() => state[activeTab], [activeTab, state]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="rounded-[36px] border border-[#E8E4DC] bg-[#F9F6EE] px-6 py-7 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0C3B2E]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0C3B2E]" /> Portfolio
            </div>
            <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-[#0C3B2E]">Track your discovery, allocation requests, and active investments.</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/investor" className="rounded-full border border-[#E0DCD3] bg-white/90 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
              Marketplace
            </Link>
            <Link href="/investor/profile" className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
              Profile
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${activeTab === tab ? "bg-[#0C3B2E] text-white" : "bg-[#F9F6EE] text-[#5A5A58]"}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          {items.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#E2DDD0] bg-[#F9F6EE] p-6 text-sm text-[#5A5A58]">
              {activeTab === "pending"
                ? "No pending approvals yet. Confirm an offer from the marketplace to move it into this queue."
                : activeTab === "active"
                  ? "No active investments yet. Once a request is approved, it will appear here."
                  : "No saved deals yet. Save opportunities from the marketplace to build your pipeline."}
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)] transition hover:-translate-y-0.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">{item.sector} • {item.stage}</p>
                  <h2 className="mt-2 font-serif text-xl text-[#0C3B2E]">{item.name}</h2>
                  <p className="mt-2 text-sm text-[#5A5A58]">{item.note}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-2 text-sm font-semibold text-[#0C3B2E]">${item.amount.toLocaleString()}</div>
                  {activeTab === "active" && (
                    <button
                      onClick={() => setRelistingItem(item)}
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
                    >
                      Relist for Secondary
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Relisting Modal ── */}
      <AnimatePresence>
        {relistingItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[36px] border border-[#E8E4DC] bg-[#F9F6EE] p-8 shadow-[0_20px_100px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Secondary Market Listing</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#0C3B2E]">Relist your {relistingItem.name} allocation</h3>
                </div>
                <button onClick={() => setRelistingItem(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Close</button>
              </div>

              {/* ── Current Holding ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-white/80 p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Your current holding</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-[#5A5A58]">Position Size</p>
                    <p className="mt-1 font-serif text-xl font-bold text-[#0C3B2E]">${relistingItem.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5A5A58]">Est. Equity Units</p>
                    <p className="mt-1 font-serif text-xl font-bold text-[#1A1A1A]">{Math.round(relistingItem.amount / 10_000).toLocaleString()} units</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5A5A58]">Unrealized Value</p>
                    <p className="mt-1 font-serif text-xl font-bold text-emerald-600">+${Math.round(relistingItem.amount * 0.18).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* ── Pricing Slider ── */}
              <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">Pricing Strategy</p>
                <p className="mt-2 text-sm text-[#5A5A58]">Set your discount or premium relative to fair market value</p>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5A5A58]">-50% Discount</span>
                    <span className="text-xs font-semibold text-[#5A5A58]">Fair Price</span>
                    <span className="text-xs font-semibold text-[#5A5A58]">+50% Premium</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={relistingPricing}
                    onChange={(e) => setRelistingPricing(Number(e.target.value))}
                    className="mt-3 w-full accent-amber-500"
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-[#5A5A58]">List Price</p>
                      <p className="mt-1 font-serif text-lg font-bold text-[#0C3B2E]">
                        ${Math.round(relistingItem.amount * (1 + relistingPricing / 100)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase ${relistingPricing < 0 ? "bg-rose-100 text-rose-700" : relistingPricing > 0 ? "bg-emerald-100 text-emerald-700" : "bg-[#F0ECE1] text-[#0C3B2E]"}`}>
                        {relistingPricing < 0 ? `${relistingPricing}% Discount` : relistingPricing > 0 ? `+${relistingPricing}% Premium` : "Fair Market"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Secondary Buyers ── */}
              <div className="mt-6 rounded-[28px] border border-[#E8E4DC] bg-white/80 p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Potential Buyers</p>
                <p className="mt-2 text-sm text-[#5A5A58]">Your position will be visible to {Math.floor(Math.random() * 45) + 12} accredited investors matching your opportunity profile</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 text-sm">
                    <span className="text-[#5A5A58]">Institutional Buyers</span>
                    <span className="font-semibold text-[#0C3B2E]">{Math.floor(Math.random() * 15) + 5}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 text-sm">
                    <span className="text-[#5A5A58]">Individual Accredited Investors</span>
                    <span className="font-semibold text-[#0C3B2E]">{Math.floor(Math.random() * 30) + 8}</span>
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setRelistingItem(null)} className="rounded-full border border-[#E0DCD3] bg-white/90 px-6 py-3 text-sm font-medium text-[#1A1A1A] transition hover:bg-white">Cancel</button>
                <button
                  onClick={() => {
                    setRelistingItem(null);
                    alert(`✓ Listing created! Your position is now visible to accredited investors at ${Math.round(relistingItem.amount * (1 + relistingPricing / 100)).toLocaleString()}`);
                  }}
                  className="rounded-full bg-[#0C3B2E] px-8 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]"
                >
                  Create Listing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
