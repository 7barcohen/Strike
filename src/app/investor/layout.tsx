import type { ReactNode } from "react";

export const metadata = {
  title: "Strike | Investor Portal",
  description: "Instant underwriting and private market deal pipeline.",
};

export default function InvestorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.9),_transparent_50%)]">{children}</div>;
}
