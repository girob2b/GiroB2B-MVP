"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

interface CopyPublicUrlProps {
  displayUrl: string;
  absoluteUrl: string;
}

export function CopyPublicUrl({ displayUrl, absoluteUrl }: CopyPublicUrlProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">
        {displayUrl}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          copied
            ? "bg-[color:var(--brand-primary-100)] text-[color:var(--brand-primary-700)]"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
        }`}
        aria-label="Copiar link"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </>
        )}
      </button>
    </div>
  );
}
