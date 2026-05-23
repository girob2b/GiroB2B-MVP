import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <section className="mb-12">
      <header className="mb-5">
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: "var(--ink-primary)" }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-sm leading-relaxed max-w-2xl"
            style={{ color: "var(--ink-secondary)" }}
          >
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
