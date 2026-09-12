"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTicketSize, loadInvestorPreferences, saveInvestorPreferences, type InvestorPreferences } from "@/lib/investor-storage";

const sectors = ["AI", "Cyber", "Fintech", "SaaS", "Health"] as const;

export default function InvestorProfilePage() {
  const [preferences, setPreferences] = useState<InvestorPreferences>(loadInvestorPreferences());
  const [saved, setSaved] = useState(false);
  const [accreditationStep, setAccreditationStep] = useState(0);
  const [assets, setAssets] = useState<number | null>(null);
  const [income, setIncome] = useState<number | null>(null);
  const [isAccredited, setIsAccredited] = useState(false);

  useEffect(() => {
    setPreferences(loadInvestorPreferences());
  }, []);

  const updateSector = (sector: string) => {
    setPreferences((current) => ({
      ...current,
      preferredSectors: current.preferredSectors.includes(sector)
        ? current.preferredSectors.filter((item) => item !== sector)
        : [...current.preferredSectors, sector],
    }));
  };

  const handleSave = () => {
    saveInvestorPreferences(preferences);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const checkAccreditation = () => {
    const netWorthThreshold = 1_000_000;
    const incomeThreshold = 200_000;
    
    if (accreditationStep === 0 && assets && assets >= netWorthThreshold) {
      setIsAccredited(true);
      setAccreditationStep(2); // Jump to verified
    } else if (accreditationStep === 1 && income && income >= incomeThreshold) {
      setIsAccredited(true);
      setAccreditationStep(2); // Jump to verified
    } else {
      setAccreditationStep((current) => current + 1);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="rounded-[36px] border border-[#E8E4DC] bg-[#F9F6EE] px-6 py-7 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0C3B2E]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0C3B2E]" /> Investor profile
            </div>
            <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-[#0C3B2E]">Personalize your allocator mandate and opportunity fit.</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/investor" className="rounded-full border border-[#E0DCD3] bg-white/90 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
              Marketplace
            </Link>
            <Link href="/investor/portfolio" className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
              Portfolio
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-8 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
          <div className="space-y-5">
            <label className="block text-sm text-[#5A5A58]">
              <span className="mb-2 block font-semibold text-[#1A1A1A]">Firm or fund name</span>
              <input value={preferences.firmName} onChange={(event) => setPreferences((current) => ({ ...current, firmName: event.target.value }))} className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 outline-none text-[#1A1A1A] shadow-[0_10px_30px_rgba(12,59,46,0.03)]" />
            </label>

            <label className="block text-sm text-[#5A5A58]">
              <span className="mb-2 block font-semibold text-[#1A1A1A]">Target ticket size</span>
              <select value={preferences.ticketSizeUsd} onChange={(event) => setPreferences((current) => ({ ...current, ticketSizeUsd: Number(event.target.value) }))} className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 outline-none text-[#1A1A1A] shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                {[50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000].map((size) => (
                  <option key={size} value={size}>{formatTicketSize(size)}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-[#5A5A58]">
              <span className="mb-2 block font-semibold text-[#1A1A1A]">Risk appetite</span>
              <select value={preferences.riskAppetite} onChange={(event) => setPreferences((current) => ({ ...current, riskAppetite: event.target.value as InvestorPreferences["riskAppetite"] }))} className="w-full rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] px-4 py-3 outline-none text-[#1A1A1A] shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
                <option value="Defensive">Defensive</option>
                <option value="Balanced">Balanced</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </label>

            <div>
              <p className="mb-2 font-semibold text-[#1A1A1A]">Preferred sectors</p>
              <div className="flex flex-wrap gap-2">
                {sectors.map((sector) => (
                  <button key={sector} type="button" onClick={() => updateSector(sector)} className={`rounded-full border px-3 py-2 text-sm font-medium transition ${preferences.preferredSectors.includes(sector) ? "border-[#0C3B2E] bg-[#F0ECE1] text-[#0C3B2E]" : "border-[#E8E4DC] bg-[#F9F6EE] text-[#5A5A58]"}`}>
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Accreditation Verification ─── */}
            <div className="rounded-[24px] border border-[#E8E4DC] bg-[#F9F6EE] p-5 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1A1A1A]">Accredited Investor Status</h3>
                {isAccredited && (
                  <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                    ✓ Verified
                  </span>
                )}
              </div>

              {!isAccredited ? (
                <div className="mt-4 space-y-4">
                  {accreditationStep === 0 && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A5A58]">Net worth (excluding primary residence)</label>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          value={assets || ""}
                          onChange={(e) => setAssets(e.target.value ? Number(e.target.value) : null)}
                          placeholder="$1,000,000+"
                          className="flex-1 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-2 text-sm outline-none"
                        />
                        <button
                          onClick={checkAccreditation}
                          className="rounded-full bg-[#0C3B2E] px-6 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F]"
                        >
                          Check
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[#5A5A58]">Threshold: $1,000,000+</p>
                    </div>
                  )}

                  {accreditationStep === 1 && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A5A58]">Annual income (2 of last 3 years)</label>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          value={income || ""}
                          onChange={(e) => setIncome(e.target.value ? Number(e.target.value) : null)}
                          placeholder="$200,000+"
                          className="flex-1 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-2 text-sm outline-none"
                        />
                        <button
                          onClick={checkAccreditation}
                          className="rounded-full bg-[#0C3B2E] px-6 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-[#124E3F]"
                        >
                          Check
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[#5A5A58]">Threshold: $200,000+ individual / $300,000+ joint</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-emerald-700">Your accredited investor status has been verified. You have full access to all allocations.</p>
              )}
            </div>

            <button onClick={handleSave} className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
              {saved ? "Preferences saved" : "Save preferences"}
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-[#E8E4DC] bg-white/80 p-8 shadow-[0_20px_80px_rgba(12,59,46,0.06)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Live matching brief</p>
          <h2 className="mt-3 font-serif text-2xl text-[#0C3B2E]">Your mandate is tuned to capture the right opportunities.</h2>
          <div className="mt-6 space-y-3 text-sm text-[#5A5A58]">
            <div className="rounded-[20px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">Risk appetite: {preferences.riskAppetite}</div>
            <div className="rounded-[20px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">Target ticket: {formatTicketSize(preferences.ticketSizeUsd)}</div>
            <div className="rounded-[20px] border border-[#E8E4DC] bg-[#F9F6EE] p-4 shadow-[0_10px_30px_rgba(12,59,46,0.03)]">Preferred sectors: {preferences.preferredSectors.join(", ") || "None"}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
