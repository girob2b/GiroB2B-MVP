import { useState } from "react";
import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const DURATIONS = [
  { key: "instant", ms: 100, use: "feedback tátil (toggle, checkbox)" },
  { key: "fast", ms: 150, use: "hover, focus" },
  { key: "base", ms: 200, use: "default — transições padrão", isDefault: true },
  { key: "slow", ms: 300, use: "abertura de modais, popovers" },
  { key: "slower", ms: 500, use: "entradas elaboradas (hero, onboarding)" },
];

const EASINGS = [
  { key: "linear", use: "progress bars" },
  { key: "in", use: "saídas (elemento sai da tela)" },
  { key: "out", use: "default — entradas", isDefault: true },
  { key: "in-out", use: "mudanças de estado in-place" },
  { key: "spring", use: "success / celebração — pontual" },
];

function DurationDemo({ keyName, ms }: { keyName: string; ms: number }) {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className="w-full"
      title="Clique pra animar"
    >
      <div
        className="h-12 rounded-md relative overflow-hidden"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="h-full"
          style={{
            background: "var(--brand-500)",
            width: on ? "100%" : "8%",
            transition: `width var(--duration-${keyName}) var(--ease-out)`,
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-mono"
          style={{ color: "var(--ink-primary)" }}
        >
          {ms}ms
        </span>
      </div>
    </button>
  );
}

function EasingDemo({ keyName }: { keyName: string }) {
  const [on, setOn] = useState(false);
  return (
    <button onClick={() => setOn((v) => !v)} className="w-full" title="Clique pra animar">
      <div
        className="h-12 rounded-md relative overflow-hidden"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="h-8 w-8 rounded-md absolute top-2"
          style={{
            background: "var(--accent-500)",
            left: on ? "calc(100% - 40px)" : "8px",
            transition: `left 600ms var(--ease-${keyName})`,
          }}
        />
      </div>
    </button>
  );
}

export function MotionPage() {
  return (
    <div>
      <Section
        title="Durations"
        description="5 stops. Default = base (200ms). Clique pra animar."
      >
        <div className="space-y-3">
          {DURATIONS.map(({ key, ms, use, isDefault }) => (
            <div
              key={key}
              className="rounded-lg p-4 grid grid-cols-[180px_1fr_1.5fr] items-center gap-4"
              style={{
                background: "var(--surface-raised)",
                border: `1px solid ${
                  isDefault ? "var(--border-brand)" : "var(--border-subtle)"
                }`,
              }}
            >
              <div>
                <CodeBlock value={`--duration-${key}`} inline />
                {isDefault && (
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mt-1"
                    style={{ color: "var(--ink-brand)" }}
                  >
                    default
                  </p>
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {use}
              </p>
              <DurationDemo keyName={key} ms={ms} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Easings"
        description="5 curvas. Default = out (entrada). Clique pra ver curva em ação (600ms forçados)."
      >
        <div className="space-y-3">
          {EASINGS.map(({ key, use, isDefault }) => (
            <div
              key={key}
              className="rounded-lg p-4 grid grid-cols-[180px_1fr_1.5fr] items-center gap-4"
              style={{
                background: "var(--surface-raised)",
                border: `1px solid ${
                  isDefault ? "var(--border-brand)" : "var(--border-subtle)"
                }`,
              }}
            >
              <div>
                <CodeBlock value={`--ease-${key}`} inline />
                {isDefault && (
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mt-1"
                    style={{ color: "var(--ink-brand)" }}
                  >
                    default
                  </p>
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {use}
              </p>
              <EasingDemo keyName={key} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
