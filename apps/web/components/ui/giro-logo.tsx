import { cn } from "@/lib/utils";

interface GiroLogoProps {
  size?: number;
  className?: string;
  /** Se true, mostra só o ícone sem o texto "GiroB2B" */
  iconOnly?: boolean;
  /** Variante de contraste: "dark" = anel dourado sobre teal; "light" = anel dourado sobre off-white; "mono" = grafite. */
  variant?: "dark" | "light" | "mono";
}

/**
 * Anel partido (B3 — BRIEF_MARCA 2026-04-17).
 * - Fundo arredondado em teal profundo (dark) / off-white (light).
 * - Anel espesso em dourado queimado, com 3 cortes (sugere "giro em movimento").
 */
export function GiroLogo({
  size = 32,
  className,
  iconOnly = false,
  variant = "dark",
}: GiroLogoProps) {
  const palette =
    variant === "light"
      ? { bg: "#F4F1EA", ring: "#C08A2E", text: "#0A5C5C" }
      : variant === "mono"
      ? { bg: "transparent", ring: "#1A1F1F", text: "#1A1F1F" }
      : { bg: "#0A5C5C", ring: "#C08A2E", text: "#0A5C5C" };

  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {variant !== "mono" && <rect width="40" height="40" rx="10" fill={palette.bg} />}

        {/* Anel partido — 3 arcos com gaps simétricos sugerindo rotação. */}
        {/* Cada arco = 90° útil + 30° de gap. Stroke espesso, terminais arredondados. */}
        <g
          fill="none"
          stroke={palette.ring}
          strokeWidth="3.6"
          strokeLinecap="round"
          transform="rotate(-18 20 20)"
        >
          {/* Arco 1 */}
          <path d="M 32 20 A 12 12 0 0 0 26 9.6" />
          {/* Arco 2 */}
          <path d="M 20 32 A 12 12 0 0 0 30.4 26" />
          {/* Arco 3 */}
          <path d="M 8 20 A 12 12 0 0 0 14 30.4" />
          {/* Arco 4 (fechamento curto) */}
          <path d="M 13.6 9.6 A 12 12 0 0 0 8 20" strokeOpacity="0" />
        </g>
      </svg>

      {!iconOnly && (
        <span
          style={{ fontSize: size * 0.56, lineHeight: 1, letterSpacing: "-0.03em", color: palette.text }}
          className="font-bold"
        >
          GiroB2B
        </span>
      )}
    </span>
  );
}
