import type { Metadata } from "next";
import "./globals.css";
import StickyNav from "@/components/sticky-nav";

export const metadata: Metadata = {
  title: "Strike",
  description: "High-end secondary liquidity platform for option holders, powered by instant AI underwriting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <StickyNav />
        <div className="pt-24">{children}</div>
      </body>
    </html>
  );
}
