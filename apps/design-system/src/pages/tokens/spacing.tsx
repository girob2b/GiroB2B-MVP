import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const STEPS = [
  { key: "0", px: 0 },
  { key: "px", px: 1 },
  { key: "0_5", px: 2 },
  { key: "1", px: 4 },
  { key: "1_5", px: 6 },
  { key: "2", px: 8 },
  { key: "2_5", px: 10 },
  { key: "3", px: 12 },
  { key: "3_5", px: 14 },
  { key: "4", px: 16 },
  { key: "5", px: 20 },
  { key: "6", px: 24 },
  { key: "7", px: 28 },
  { key: "8", px: 32 },
  { key: "10", px: 40 },
  { key: "12", px: 48 },
  { key: "14", px: 56 },
  { key: "16", px: 64 },
  { key: "20", px: 80 },
  { key: "24", px: 96 },
  { key: "32", px: 128 },
];

const PADDINGS = [
  { key: "compact", value: "8 / 12", use: "botões small, badges, chips" },
  { key: "default", value: "12 / 16", use: "botões padrão, inputs" },
  { key: "comfortable", value: "16 / 20", use: "cards densos" },
  { key: "spacious", value: "24 / 32", use: "section / page level" },
];

export function SpacingPage() {
  return (
    <div>
      <Section
        title="Escala"
        description="Base 4px (0.25rem). Compatível com Tailwind — dev brasileiro/contratado entende sem doc."
      >
        <div className="space-y-2">
          {STEPS.map(({ key, px }) => (
            <div
              key={key}
              className="rounded px-3 py-2 flex items-center gap-4"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="w-32 shrink-0">
                <CodeBlock value={`--space-${key}`} inline />
              </div>
              <span
                className="text-xs font-mono w-12 shrink-0"
                style={{ color: "var(--ink-muted)" }}
              >
                {px}px
              </span>
              <div className="flex-1">
                <div
                  className="h-3 rounded-sm"
                  style={{
                    background: "var(--brand-500)",
                    width: `${px}px`,
                    minWidth: px === 0 ? "0" : "1px",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Paddings nomeados"
        description="Compostos pra padronizar densidade. Use nos componentes em vez de spacings crus."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PADDINGS.map(({ key, value, use }) => (
            <div
              key={key}
              className="rounded-lg overflow-hidden"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="p-4">
                <CodeBlock value={`--padding-${key}`} />
                <p
                  className="text-xs mt-2 font-mono"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {value}px (vertical / horizontal)
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  {use}
                </p>
              </div>
              <div
                className="px-4 py-3"
                style={{
                  background: "var(--surface-brand-soft)",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="inline-block rounded text-xs font-semibold"
                  style={{
                    padding: `var(--padding-${key})`,
                    background: "var(--surface-brand)",
                    color: "var(--ink-inverse)",
                  }}
                >
                  Exemplo
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
