import { cn } from "@/lib/utils";

interface GiroLoaderProps {
  /** Mensagem opcional abaixo do spinner. */
  label?: string;
  /** "overlay" = full-screen com backdrop; "inline" = inline pra Suspense fallback. */
  variant?: "overlay" | "inline";
  /** Tamanho do spinner em pixels (default: 64 overlay, 48 inline). */
  size?: number;
  className?: string;
}

/**
 * Loader oficial da plataforma — spinner com dois arcos opostos terminando em
 * setas, sugerindo o "giro" (alusão ao giro de estoque do B2B).
 *
 * Uso:
 *   <GiroLoader label="Entrando…" />               → overlay (default)
 *   <GiroLoader variant="inline" label="…" />      → inline (Suspense fallback)
 */
export function GiroLoader({
  label,
  variant = "overlay",
  size,
  className,
}: GiroLoaderProps) {
  const spinnerSize = size ?? (variant === "overlay" ? 64 : 48);

  const content = (
    <div className={cn("flex flex-col items-center gap-4 text-[color:var(--brand-green-700)]", className)}>
      <GiroSpinner size={spinnerSize} />
      {label && (
        <p className="text-sm font-medium text-slate-600">{label}</p>
      )}
      <span className="sr-only">Carregando</span>
    </div>
  );

  if (variant === "inline") {
    return <div className="flex items-center justify-center py-12">{content}</div>;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
    >
      {content}
    </div>
  );
}

/** SVG do spinner — dois arcos opostos com pontas em seta, gira continuamente. */
function GiroSpinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="giro-loader-spin"
    >
      {/* Arco superior — começa em ~30° (direita-cima) e vai até ~210° passando pelo topo */}
      <path
        d="M 38.78 15 A 17 17 0 0 0 9.22 15"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Seta da ponta superior-direita */}
      <path
        d="M 38.78 15 L 41.5 9 L 35 11"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Arco inferior — espelhado */}
      <path
        d="M 9.22 33 A 17 17 0 0 0 38.78 33"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Seta da ponta inferior-esquerda */}
      <path
        d="M 9.22 33 L 6.5 39 L 13 37"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
