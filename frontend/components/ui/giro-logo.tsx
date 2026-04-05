import { cn } from "@/lib/utils";

interface GiroLogoProps {
  size?: number;
  className?: string;
  /** Se true, mostra só o ícone sem o texto "GiroB2B" */
  iconOnly?: boolean;
}

export function GiroLogo({ size = 32, className, iconOnly = false }: GiroLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      {/* Ícone SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="giro-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#16a34a" />
            <stop offset="1" stopColor="#15803d" />
          </linearGradient>
        </defs>

        {/* Fundo arredondado */}
        <rect width="40" height="40" rx="10" fill="url(#giro-grad)" />

        {/* Letra G estilizada */}
        <path
          d="M22.5 12C17.806 12 14 15.806 14 20.5C14 25.194 17.806 29 22.5 29C25.416 29 28 27.614 29.618 25.424L29.656 25.37V20.5H22.5V22.5H27.5V24.756C26.308 26.148 24.506 27 22.5 27C18.91 27 16 24.09 16 20.5C16 16.91 18.91 14 22.5 14C24.242 14 25.822 14.69 27 15.81L28.42 14.39C26.866 12.9 24.788 12 22.5 12Z"
          fill="white"
        />

        {/* Seta circular pequena (topo direito — representa "giro") */}
        <path
          d="M30 9 C32.5 9 34.5 11 34.5 13.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
        <polygon
          points="34.5,11 34.5,15.5 30.5,13.5"
          fill="white"
          opacity="0.75"
        />
      </svg>

      {/* Nome */}
      {!iconOnly && (
        <span
          style={{ fontSize: size * 0.56, lineHeight: 1 }}
          className="font-bold tracking-tight text-foreground"
        >
          GiroB2B
        </span>
      )}
    </span>
  );
}
