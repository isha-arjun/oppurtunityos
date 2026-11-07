import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpportunityOS — Find your next business opportunity",
  description: "A curated opportunity intelligence dashboard for tenders, grants, startup programmes and business leads in India.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}