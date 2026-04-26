import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import CookieBanner from "@/components/cookie-banner";
import { NavigationProgress } from "@/components/navigation-progress";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GiroB2B — Marketplace B2B do Brasil",
    template: "%s | GiroB2B",
  },
  description:
    "Encontre fornecedores verificados de qualquer setor em qualquer cidade do Brasil. 100% gratuito para compradores.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://girob2b.com.br"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "GiroB2B",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <NavigationProgress />
        {children}
        <CookieBanner />
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
