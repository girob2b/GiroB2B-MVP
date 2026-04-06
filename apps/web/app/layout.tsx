import type { Metadata } from "next";
import { Geist } from "next/font/google";
import CookieBanner from "@/components/cookie-banner";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
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
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <CookieBanner />
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
