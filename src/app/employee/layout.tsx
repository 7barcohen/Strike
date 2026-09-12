import type { ReactNode } from "react";

export const metadata = {
  title: "Strike | Employee Portal",
  description: "Option holder compensation and net-to-bank modeling.",
};

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_50%)]">{children}</div>;
}
