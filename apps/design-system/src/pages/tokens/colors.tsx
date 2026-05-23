import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const SCALE_SHORT = [50, 100, 300, 500, 600, 700, 900] as const;

interface SwatchProps {
  varName: string;
  /** Tom mais claro precisa de texto escuro; mais escuro precisa de claro. */
  tone: "light" | "dark";
}

function Swatch({ varName, tone }: SwatchProps) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--border-subtle)" }}
    >
      <div
        className="h-16 flex items-end justify-end px-2 py-1"
        style={{
          background: `var(--${varName})`,
          color: tone === "light" ? "var(--ink-primary)" : "var(--ink-inverse)",
        }}
      >
        <span className="text-[10px] font-mono">{varName}</span>
      </div>
    </div>
  );
}

function ScaleRow({ prefix, label }: { prefix: string; label: string }) {
  return (
    <div className="mb-6">
      <p
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--ink-secondary)" }}
      >
        {label}
      </p>
      <div className="grid grid-cols-10 gap-2">
        {SCALE.map((tone) => (
          <Swatch
            key={tone}
            varName={`${prefix}-${tone}`}
            tone={tone < 500 ? "light" : "dark"}
          />
        ))}
      </div>
    </div>
  );
}

function ShortScaleRow({ prefix, label }: { prefix: string; label: string }) {
  return (
    <div className="mb-6">
      <p
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--ink-secondary)" }}
      >
        {label}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {SCALE_SHORT.map((tone) => (
          <Swatch
            key={tone}
            varName={`${prefix}-${tone}`}
            tone={tone < 500 ? "light" : "dark"}
          />
        ))}
      </div>
    </div>
  );
}

const SEMANTIC_TOKENS: Array<{ name: string; description: string }> = [
  { name: "surface", description: "page background — body padrão" },
  { name: "surface-raised", description: "cards, popovers, modais (1 nível acima do body)" },
  { name: "surface-sunken", description: "áreas com hierarquia visual menor" },
  { name: "surface-inverse", description: "footers e heros escuros" },
  { name: "surface-brand", description: "CTAs primários, headers institucionais" },
  { name: "surface-brand-soft", description: "callouts brand claros" },
  { name: "ink-primary", description: "texto principal" },
  { name: "ink-secondary", description: "texto de suporte" },
  { name: "ink-muted", description: "placeholder, desativado" },
  { name: "ink-subtle", description: "ainda mais leve — em última camada" },
  { name: "ink-inverse", description: "texto sobre brand/escuro" },
  { name: "ink-brand", description: "texto destacando brand (links etc)" },
  { name: "ink-accent", description: "texto destacando accent (gold)" },
  { name: "border-subtle", description: "divisória default" },
  { name: "border-default", description: "borda de input / card" },
  { name: "border-strong", description: "borda enfática" },
  { name: "border-brand", description: "borda destacando brand" },
  { name: "border-focus", description: "borda de focus visual" },
  { name: "action-primary-bg", description: "CTA primário — background" },
  { name: "action-primary-fg", description: "CTA primário — texto" },
  { name: "action-accent-bg", description: "CTA accent (gold) — background" },
  { name: "action-danger-bg", description: "CTA destrutivo — background" },
];

function SemanticToken({ name, description }: { name: string; description: string }) {
  const isSurface = name.startsWith("surface");
  const isInk = name.startsWith("ink");
  const isBorder = name.startsWith("border");

  return (
    <div
      className="rounded-lg p-3 flex items-center gap-4"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Preview visual do token */}
      <div
        className="h-12 w-16 shrink-0 rounded-md flex items-center justify-center text-xs font-bold"
        style={{
          background: isSurface
            ? `var(--${name})`
            : isInk
            ? "var(--surface-raised)"
            : "var(--surface)",
          color: isInk ? `var(--${name})` : "var(--ink-primary)",
          border: isBorder
            ? `2px solid var(--${name})`
            : "1px solid var(--border-subtle)",
        }}
      >
        {isInk ? "Aa" : isBorder ? "□" : ""}
      </div>
      <div className="flex-1 min-w-0">
        <CodeBlock value={`var(--${name})`} inline />
        <p
          className="text-xs mt-1 leading-snug"
          style={{ color: "var(--ink-secondary)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div>
      <Section
        title="Semânticos"
        description="95% dos usos. Sempre prefira estes — eles refletem intenção. Mudar valores afeta toda a UI sem reescrever componente."
      >
        <div className="grid grid-cols-2 gap-3">
          {SEMANTIC_TOKENS.map((t) => (
            <SemanticToken key={t.name} {...t} />
          ))}
        </div>
      </Section>

      <Section
        title="Primitivos — Brand (Teal profundo)"
        description={
          <>
            BRIEF_MARCA primary. Default <code>--brand-600 (#0A5C5C)</code>. Use
            via <code>var(--brand-600)</code> ou Tailwind <code>bg-brand-600</code>.
          </>
        }
      >
        <ScaleRow prefix="brand" label="brand-50 → brand-900" />
      </Section>

      <Section
        title="Primitivos — Accent (Dourado queimado)"
        description={
          <>
            BRIEF_MARCA accent. Default <code>--accent-500 (#C08A2E)</code>.
            Reservado pra <strong>CTA secundário</strong> e <strong>símbolo do logo</strong>{" "}
            — não usar pra warning (gold ≠ atenção).
          </>
        }
      >
        <ScaleRow prefix="accent" label="accent-50 → accent-900" />
      </Section>

      <Section
        title="Primitivos — Neutral (Graphite + off-white)"
        description="Spectrum de cinzas. neutral-0 = branco puro, neutral-1000 = quase preto. Backgrounds, texto, bordas — quase tudo passa por aqui."
      >
        <div className="grid grid-cols-12 gap-2 mb-2">
          {[0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(
            (tone) => (
              <Swatch
                key={tone}
                varName={`neutral-${tone}`}
                tone={tone < 500 ? "light" : "dark"}
              />
            ),
          )}
        </div>
      </Section>

      <Section
        title="Primitivos — Feedback semantics"
        description="Sucesso (emerald), aviso (âmbar — separado do gold), erro (red), info (sky). Cada um com escala reduzida."
      >
        <ShortScaleRow prefix="success" label="success" />
        <ShortScaleRow prefix="warning" label="warning" />
        <ShortScaleRow prefix="danger" label="danger" />
        <ShortScaleRow prefix="info" label="info" />
      </Section>
    </div>
  );
}
