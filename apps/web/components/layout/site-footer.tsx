import Link from "next/link";
import { GiroLogo } from "@/components/ui/giro-logo";

/**
 * Footer institucional/SEO — compartilhado por todos os shells públicos.
 *
 * Links legais (termos/privacidade/FAQ) + links de categoria (SEO + descoberta)
 * + pitch "sem taxa por venda" + marca.
 *
 * Decisão 2026-06-22 (#16 unificar-shells-publicos):
 * Criado junto com a unificação de shells. Todas as páginas públicas ganham
 * footer via GuestShell (único shell público após esta rodada).
 */
export function SiteFooter() {
  return (
    <footer
      aria-label="Rodapé"
      className="mt-16 border-t border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca + tagline */}
          <div className="space-y-3 lg:col-span-1">
            <Link href="/" aria-label="GiroB2B — início" className="inline-block">
              <GiroLogo size={28} />
            </Link>
            <p className="text-sm leading-relaxed text-slate-500">
              Marketplace B2B reverso: você publica o que precisa, vendedores te
              chamam. Sem taxa por venda.
            </p>
          </div>

          {/* Compradores */}
          <nav aria-label="Compradores">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Compradores
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/postar"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Publicar demanda
                </Link>
              </li>
              <li>
                <Link
                  href="/buscar"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Ver demandas
                </Link>
              </li>
              <li>
                <Link
                  href="/categorias"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Categorias
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Perguntas frequentes
                </Link>
              </li>
            </ul>
          </nav>

          {/* Vendedores */}
          <nav aria-label="Vendedores">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Vendedores
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/seja-vendedor"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Seja vendedor
                </Link>
              </li>
              <li>
                <Link
                  href="/seja-vendedor#como-funciona"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Como funciona
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  FAQ Vendedores
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Links legais">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Legal
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/termos"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidade"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  Política de privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidade#lgpd"
                  className="text-slate-600 transition-colors hover:text-brand-700"
                >
                  LGPD
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} GiroB2B &mdash; Marketplace B2B
            reverso brasileiro
          </p>
          <p className="text-slate-400">
            Sem taxa por venda &middot; Sem CNPJ obrigatório
          </p>
        </div>
      </div>
    </footer>
  );
}
