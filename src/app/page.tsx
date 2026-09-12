"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const portalCards = [
  {
    title: "I am an Option Holder",
    description: "Access liquidity modeling, PDF intake, and instant net-to-bank guidance.",
    href: "/employee",
  },
  {
    title: "I am an Investor",
    description: "Onboard with a deal questionnaire and receive AI-driven valuation scores.",
    href: "/investor",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-[#1A1A1A] sm:px-8 lg:px-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-6xl rounded-[40px] border border-[#E8E4DC] bg-[#F9F6EE] p-8 shadow-[0_20px_80px_rgba(12,59,46,0.08)] sm:p-12"
      >
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0C3B2E]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0C3B2E]" /> Private concierge
            </div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.05] text-[#0C3B2E] sm:text-5xl lg:text-6xl">
              The Liquidity Layer for <span className="italic text-[#0C3B2E]">Private Equity</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5A5A58]">
              Institutional-grade execution, instant AI underwriting, and a seamless path from grant evidence to liquidity.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/employee" className="rounded-full bg-[#0C3B2E] px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#124E3F]">
                Enter employee portal
              </Link>
              <Link href="/investor" className="rounded-full border border-[#E0DCD3] bg-white/90 px-8 py-4 text-sm font-medium text-[#1A1A1A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
                Explore investor market
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#E8E4DC] bg-white/80 p-6 shadow-[0_10px_30px_rgba(12,59,46,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Live intelligence</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">FMV signal</div>
                <div className="mt-2 font-serif text-2xl text-[#0C3B2E]">$3.2M</div>
              </div>
              <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">Net-to-bank</div>
                <div className="mt-2 font-serif text-2xl text-[#0C3B2E]">$842K</div>
              </div>
              <div className="rounded-2xl border border-[#E8E4DC] bg-[#F9F6EE] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A58]">Allocation policy</div>
                <div className="mt-2 text-sm font-medium text-[#1A1A1A]">Full grant allocation only</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {portalCards.map((card) => (
            <motion.div key={card.title} whileHover={{ y: -6, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Link href={card.href} className="group flex h-full flex-col rounded-[30px] border border-[#E8E4DC] bg-white/80 p-7 shadow-[0_10px_30px_rgba(12,59,46,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:bg-white">
                <div className="inline-flex w-fit items-center rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0C3B2E]">
                  {card.title.includes("Investor") ? "Investor" : "Employee"}
                </div>
                <h2 className="mt-5 font-serif text-2xl text-[#0C3B2E]">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#5A5A58]">{card.description}</p>
                <div className="mt-6 inline-flex items-center text-sm font-medium text-[#1A1A1A]">
                  Enter portal
                  <span className="ml-2 transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm text-[#5A5A58]">
          <span className="rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0C3B2E]">Instant AI valuation</span>
          <span className="rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0C3B2E]">Section 102 routing</span>
          <span className="rounded-full border border-[#E2DDD0] bg-[#F0ECE1] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0C3B2E]">Institutional efficiency</span>
        </div>
      </motion.div>
    </main>
  );
}
