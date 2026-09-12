import type { ReactNode } from "react";

export const metadata = {
  title: "Strike | Admin Portal",
  description: "Agent and transaction monitoring workspace.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_transparent_60%)]">{children}</div>;
}
