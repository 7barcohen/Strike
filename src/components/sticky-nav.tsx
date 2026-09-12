"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/employee", label: "Employee" },
  { href: "/investor", label: "Investor" },
  { href: "/admin", label: "Admin" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StickyNav() {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-[70] px-4 py-4 sm:px-8"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-[#E8E4DC] bg-[#FBF9F5]/95 px-3 py-2 shadow-[0_18px_60px_rgba(12,59,46,0.08)] backdrop-blur-xl">
        <Link href="/" className="rounded-full bg-[#0C3B2E] px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FBF9F5] transition hover:bg-[#124E3F]">
          Strike
        </Link>

        <nav className="relative flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  active ? "text-[#FBF9F5]" : "text-[#5A5A58] hover:text-[#0C3B2E]"
                }`}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="strike-nav-active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 -z-10 rounded-full bg-[#0C3B2E]"
                    />
                  )}
                </AnimatePresence>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}
