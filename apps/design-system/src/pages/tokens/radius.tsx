import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const STEPS = [
  { key: "none", px: 0, use: "elementos com canto vivo (raro)" },
  { key: "xs", px: 2, use: "badges minúsculos" },
  { key: "sm", px: 4, use: "badges, chips" },
  { key: "md", px: 6, use: "inputs, botões small" },
  { key: "lg", px: 8, use: "default — botões, cards, dialogs", isDefault: true },
  { key: "xl", px: 12, use: "cards de hero, modais com pitch" },
  { key: "2xl", px: 16, use: "callouts decorativos" },
  { key: "3xl", px: 24, use: "hero institucional, raro em UI" },
  { key: "full", px: 9999, use: "avatares, pills" },
];

export function RadiusPage() {
  return (
    <div>
      <Section
        title="Escala"
        description={
          <>
            Default = <code>lg (8px)</code>. B2B sóbrio — não usar <code>2xl</code>/
            <code>3xl</code> em UI funcional (fica fintech).
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map(({ key, px, use, isDefault }) => (
            <div
              key={key}
              className="overflow-hidden flex flex-col"
              style={{
                background: "var(--surface-raised)",
                border: `2px solid ${
                  isDefault ? "var(--border-brand)" : "var(--border-subtle)"
                }`,
                borderRadius: `var(--radius-${key})`,
              }}
            >
              <div
                className="h-20 flex items-center justify-center"
                style={{ background: "var(--surface-brand-soft)" }}
              >
                <div
                  className="h-12 w-12"
                  style={{
                    background: "var(--surface-brand)",
                    borderRadius: `var(--radius-${key})`,
                  }}
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <CodeBlock value={`--radius-${key}`} inline />
                  {isDefault && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--ink-brand)" }}
                    >
                      default
                    </span>
                  )}
                </div>
                <p
                  className="text-xs font-mono mt-0.5"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {key === "full" ? "9999px (pill)" : `${px}px`}
                </p>
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  {use}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
