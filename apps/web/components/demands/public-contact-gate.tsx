import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

/**
 * Botão de contato para superfícies públicas (home, /buscar, /categoria, relacionadas).
 *
 * Visitante anônimo / comprador logado / não-vendedor:
 * clicar → /seja-vendedor (funil de aquisição de vendedor).
 *
 * Não replica a lógica de gate do ContactButton (que é para vendedores logados).
 * Esta é a CTA de aquisição de vendedores — "existe a demanda; você precisa de
 * conta de vendedor + plano para contatá-la". A home já redireciona logados pra
 * /painel, então na prática quem vê a home pública é sempre anônimo.
 *
 * Marca visual (2026-06-22): cara do WhatsApp — verde oficial #25D366 + ícone
 * da marca. Texto branco sobre whatsapp-700 (#128C3F) ≈ 4.9:1 (passa WCAG AA).
 * Sempre habilitado: o gate acontece no destino (/seja-vendedor), não no botão.
 */
export function PublicContactGate() {
  return (
    <Link
      href="/seja-vendedor"
      aria-label="Contatar este comprador via WhatsApp — precisa de conta de vendedor com plano ativo"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-whatsapp-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-whatsapp-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-700 focus-visible:ring-offset-2"
    >
      <WhatsAppIcon className="h-4 w-4 shrink-0" />
      Contatar via WhatsApp
    </Link>
  );
}

/**
 * Mantido por compatibilidade de import. Desde 2026-06-22 os cards de exemplo
 * da home usam o MESMO CTA funcional do WhatsApp (sem etiqueta "exemplo", sem
 * estado desabilitado) — então este é um alias do PublicContactGate.
 *
 * @deprecated use `PublicContactGate` diretamente.
 */
export function MockContactGate() {
  return <PublicContactGate />;
}
