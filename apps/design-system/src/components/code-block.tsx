import { useState } from "react";

interface CodeBlockProps {
  value: string;
  /** Mostra inline (sem padding/background — bom pra var refs em swatches). */
  inline?: boolean;
}

export function CodeBlock({ value, inline = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (inline) {
    return (
      <button
        onClick={copy}
        title={copied ? "Copiado!" : "Clique para copiar"}
        className="font-mono text-xs px-1.5 py-0.5 rounded transition-colors"
        style={{
          background: copied ? "var(--success-100)" : "var(--surface-sunken)",
          color: copied ? "var(--ink-success)" : "var(--ink-secondary)",
          border: `1px solid ${copied ? "var(--success-300)" : "var(--border-subtle)"}`,
        }}
      >
        {copied ? "copiado!" : value}
      </button>
    );
  }

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <code
        className="font-mono text-xs"
        style={{ color: "var(--ink-secondary)" }}
      >
        {value}
      </code>
      <button
        onClick={copy}
        className="text-xs px-2 py-1 rounded font-medium transition-colors shrink-0"
        style={{
          background: copied ? "var(--success-100)" : "var(--surface-raised)",
          color: copied ? "var(--ink-success)" : "var(--ink-secondary)",
          border: `1px solid ${copied ? "var(--success-300)" : "var(--border-default)"}`,
        }}
      >
        {copied ? "✓ copiado" : "copiar"}
      </button>
    </div>
  );
}
