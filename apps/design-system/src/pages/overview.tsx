export function Overview() {
  return (
    <div className="space-y-8">
      <header>
        <h2
          className="text-3xl font-bold mb-3"
          style={{ color: "var(--ink-primary)" }}
        >
          GiroB2B Design System
        </h2>
        <p
          className="text-base leading-relaxed max-w-2xl"
          style={{ color: "var(--ink-secondary)" }}
        >
          Fonte única de verdade visual de toda a plataforma. Tokens compartilhados
          entre <code>apps/web</code>, <code>apps/admin</code> e <code>apps/girob2b-landing-page</code>.
          Mudar um token aqui é mudar nas três superfícies.
        </p>
      </header>

      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--surface-brand-soft)",
          border: "1px solid var(--brand-200)",
        }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-widest mb-2"
          style={{ color: "var(--ink-brand)" }}
        >
          Local-only
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-primary)" }}>
          Esse mini-site existe apenas em ambiente de desenvolvimento.
          Sem deploy, sem URL pública. Versionado no monorepo pra IA / colaboradores futuros poderem
          consultar offline. Rodar:{" "}
          <code
            className="px-2 py-0.5 rounded text-xs"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-default)",
            }}
          >
            pnpm --filter @girob2b/design-system dev
          </code>
        </p>
      </div>

      <section>
        <h3
          className="text-base font-bold mb-4"
          style={{ color: "var(--ink-primary)" }}
        >
          Princípios
        </h3>
        <ol className="space-y-3">
          {[
            ["Token over class", "Nunca hardcode cor/spacing em componente — sempre referência um token semântico."],
            ["Semântico over primitivo", "Use --surface-raised, não --neutral-0. Primitivo só quando o semântico não cobre."],
            ["3 superfícies, 1 source", "Web, admin e landing importam o mesmo tokens.css. Mudar lá = mudar nas três."],
            ["Mobile first", "Layouts assumem viewport mínimo sm (640px). Acima vai por progressive enhancement."],
            ["A11y por default", "Focus ring visível, contraste WCAG AA, foco programático em modais."],
          ].map(([title, body], i) => (
            <li key={i} className="flex gap-4">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: "var(--surface-brand)",
                  color: "var(--ink-inverse)",
                }}
              >
                {i + 1}
              </span>
              <div>
                <p
                  className="font-bold"
                  style={{ color: "var(--ink-primary)" }}
                >
                  {title}
                </p>
                <p
                  className="text-sm mt-0.5 leading-relaxed"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3
          className="text-base font-bold mb-4"
          style={{ color: "var(--ink-primary)" }}
        >
          Estrutura
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <li>
            <strong style={{ color: "var(--ink-primary)" }}>Tokens</strong> —
            cores, tipografia, spacing, radius, shadow, motion. Importáveis em
            CSS via <code>var(--brand-600)</code> ou via Tailwind via <code>bg-brand-600</code>.
          </li>
          <li>
            <strong style={{ color: "var(--ink-primary)" }}>Primitivos</strong> —
            Button, Input, Card, Dialog, Badge etc. Vivem em{" "}
            <code>apps/web/components/ui/</code>. <em>Galeria visual: Fase 3.</em>
          </li>
          <li>
            <strong style={{ color: "var(--ink-primary)" }}>Patterns</strong> —
            PageHeader, EmptyState, DataTable etc. <em>Fase 3.</em>
          </li>
          <li>
            <strong style={{ color: "var(--ink-primary)" }}>Fluxos</strong> —
            réplicas visuais dos 7 fluxos canônicos. Input:{" "}
            <code>docs/casos-de-uso.md</code>. <em>Fase 3.</em>
          </li>
        </ul>
      </section>

      <section>
        <h3
          className="text-base font-bold mb-4"
          style={{ color: "var(--ink-primary)" }}
        >
          Onde está documentado
        </h3>
        <ul className="space-y-1 text-sm">
          <li>
            <code>packages/shared/src/design/tokens.css</code> — implementação CSS
          </li>
          <li>
            <code>docs/design-system.md</code> — decisões canônicas (escalas,
            naming, regras de componente, roadmap)
          </li>
          <li>
            <code>docs/brand/BRIEF_MARCA.md</code> — marca (paleta oficial, tom,
            posicionamento)
          </li>
          <li>
            <code>docs/casos-de-uso.md</code> — fluxos da plataforma (input pro
            DS)
          </li>
        </ul>
      </section>
    </div>
  );
}
