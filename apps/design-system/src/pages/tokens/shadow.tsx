import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const STEPS = [
  { key: "xs", use: "card flat com leve elevação" },
  { key: "sm", use: "dropdowns" },
  { key: "md", use: "cards interativos hover" },
  { key: "lg", use: "modais" },
  { key: "xl", use: "hero card" },
  { key: "2xl", use: "peso máximo — usar com parcimônia" },
];

export function ShadowPage() {
  return (
    <div>
      <Section
        title="Escala"
        description="Ladder progressiva. xs → 2xl. Subir 1 nível = ~2x mais peso visual."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map(({ key, use }) => (
            <div key={key} className="text-center">
              <div
                className="h-28 rounded-xl mb-3 flex items-center justify-center font-mono text-xs"
                style={{
                  background: "var(--surface-raised)",
                  boxShadow: `var(--shadow-${key})`,
                  color: "var(--ink-secondary)",
                }}
              >
                shadow-{key}
              </div>
              <CodeBlock value={`--shadow-${key}`} inline />
              <p
                className="text-xs mt-2"
                style={{ color: "var(--ink-secondary)" }}
              >
                {use}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Brand shadow"
        description="Tom teal. Reservada pra CTA destacado + callouts que querem chamar atenção."
      >
        <div className="max-w-sm">
          <div
            className="h-28 rounded-xl flex items-center justify-center font-mono text-xs"
            style={{
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-brand)",
              color: "var(--ink-secondary)",
            }}
          >
            shadow-brand
          </div>
          <div className="mt-3">
            <CodeBlock value="--shadow-brand" inline />
          </div>
        </div>
      </Section>

      <Section
        title="Inner shadow"
        description="Útil pra inputs com efeito sunken, ou áreas com hierarquia inferior."
      >
        <div className="max-w-sm">
          <div
            className="h-20 rounded-lg flex items-center justify-center font-mono text-xs"
            style={{
              background: "var(--surface-sunken)",
              boxShadow: "var(--shadow-inner)",
              color: "var(--ink-secondary)",
            }}
          >
            shadow-inner
          </div>
          <div className="mt-3">
            <CodeBlock value="--shadow-inner" inline />
          </div>
        </div>
      </Section>
    </div>
  );
}
