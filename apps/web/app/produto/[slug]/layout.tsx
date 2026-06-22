/**
 * Layout de /produto/[slug].
 *
 * Usa GuestShell (shell público unificado, #16 unificar-shells-publicos 2026-06-22).
 * PublicShell foi removido nesta rodada — GuestShell é o único shell público.
 *
 * Nota: a rota /produto/[slug] faz redirect 308 para o fornecedor dono do
 * produto (decisão bloco1 2026-06-21). Este layout existe apenas pra garantir
 * que a topbar correta apareça antes do redirect ser processado pelo RSC.
 */
import GuestShell from "@/components/layout/guest-shell";

export default function ProdutoLayout({ children }: { children: React.ReactNode }) {
  return <GuestShell>{children}</GuestShell>;
}
