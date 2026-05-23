import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const SIZES: Array<{ key: string; px: number }> = [
  { key: "xs", px: 12 },
  { key: "sm", px: 14 },
  { key: "base", px: 16 },
  { key: "lg", px: 18 },
  { key: "xl", px: 20 },
  { key: "2xl", px: 24 },
  { key: "3xl", px: 30 },
  { key: "4xl", px: 36 },
  { key: "5xl", px: 48 },
  { key: "6xl", px: 60 },
  { key: "7xl", px: 72 },
];

const WEIGHTS = [
  { key: "regular", value: 400 },
  { key: "medium", value: 500 },
  { key: "semibold", value: 600 },
  { key: "bold", value: 700 },
];

const LINE_HEIGHTS = [
  { key: "tight", value: 1.1 },
  { key: "snug", value: 1.25 },
  { key: "normal", value: 1.5 },
  { key: "relaxed", value: 1.625 },
  { key: "loose", value: 2 },
];

const PAIRINGS: Array<{ role: string; size: string; weight: string; lineHeight: string }> = [
  { role: "Page h1", size: "3xl–4xl", weight: "bold", lineHeight: "tight" },
  { role: "Section h2", size: "xl–2xl", weight: "bold", lineHeight: "snug" },
  { role: "Section h3", size: "lg", weight: "semibold", lineHeight: "snug" },
  { role: "Body", size: "base", weight: "regular", lineHeight: "normal" },
  { role: "Body small", size: "sm", weight: "regular", lineHeight: "normal" },
  { role: "Caption / help", size: "xs", weight: "regular/medium", lineHeight: "normal" },
  { role: "UI label", size: "xs–sm", weight: "semibold", lineHeight: "snug" },
  { role: "Button", size: "sm", weight: "semibold", lineHeight: "snug" },
];

export function TypographyPage() {
  return (
    <div>
      <Section
        title="Famílias"
        description="DM Sans cobre UI inteira. Instrument Serif é display-only — uso pontual na landing (hero), evitar no app."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-3xl mb-2"
              style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}
            >
              DM Sans
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--ink-secondary)", fontFamily: "var(--font-sans)" }}
            >
              UI principal — todos os componentes funcionais
            </p>
            <div className="mt-3">
              <CodeBlock value="var(--font-sans)" inline />
            </div>
          </div>

          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-3xl mb-2"
              style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
            >
              Instrument Serif
            </p>
            <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              Display — só landing hero, uso pontual
            </p>
            <div className="mt-3">
              <CodeBlock value="var(--font-display)" inline />
            </div>
          </div>

          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-3xl mb-2"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {"<code>"}
            </p>
            <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              Mono — código, tokens, IDs técnicos
            </p>
            <div className="mt-3">
              <CodeBlock value="var(--font-mono)" inline />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Escala de tamanhos"
        description="11 stops xs → 7xl. Default base = 16px. Mudar = mexer em --font-size-base (cascateia)."
      >
        <div className="space-y-3">
          {SIZES.map(({ key, px }) => (
            <div
              key={key}
              className="rounded-lg px-4 py-3 flex items-baseline gap-5"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="w-24 shrink-0">
                <CodeBlock value={`--font-size-${key}`} inline />
              </div>
              <span
                className="text-xs font-mono shrink-0 w-12"
                style={{ color: "var(--ink-muted)" }}
              >
                {px}px
              </span>
              <span
                style={{
                  fontSize: `var(--font-size-${key})`,
                  color: "var(--ink-primary)",
                  fontWeight: 500,
                }}
              >
                Compradores publicam, vendedores contatam.
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Weights" description="4 pesos. Evitar light (<400) — DM Sans light fica frágil em monitores baixa-densidade.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {WEIGHTS.map(({ key, value }) => (
            <div
              key={key}
              className="rounded-lg p-4 text-center"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p
                className="text-2xl mb-1"
                style={{ fontWeight: value, color: "var(--ink-primary)" }}
              >
                Aa Bb
              </p>
              <CodeBlock value={`--font-weight-${key}`} inline />
              <p
                className="text-xs mt-1 font-mono"
                style={{ color: "var(--ink-muted)" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Line heights" description="5 níveis. Default body = normal (1.5). Headings = snug ou tight.">
        <div className="space-y-3">
          {LINE_HEIGHTS.map(({ key, value }) => (
            <div
              key={key}
              className="rounded-lg p-4 flex gap-4"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="w-32 shrink-0">
                <CodeBlock value={`--line-height-${key}`} inline />
                <p
                  className="text-xs mt-1 font-mono"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {value}
                </p>
              </div>
              <p
                className="text-sm flex-1"
                style={{ lineHeight: value, color: "var(--ink-primary)" }}
              >
                A GiroB2B é um marketplace B2B brasileiro. Aqui o jogo é diferente: o
                comprador publica o que precisa e os fornecedores certos entram em
                contato pelo WhatsApp. Sem leilão, sem carrinho, sem pipeline.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Pareamentos canônicos"
        description="Regras de aplicação por papel. Source: docs/design-system.md §3.3."
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: "var(--surface-sunken)",
                  color: "var(--ink-secondary)",
                }}
              >
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide">
                  Papel
                </th>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide">
                  Size
                </th>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide">
                  Weight
                </th>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide">
                  Line height
                </th>
              </tr>
            </thead>
            <tbody>
              {PAIRINGS.map((p, i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      i % 2 === 0 ? "var(--surface-raised)" : "var(--surface-sunken)",
                  }}
                >
                  <td
                    className="px-4 py-2 font-semibold"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    {p.role}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.size}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{p.weight}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.lineHeight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
