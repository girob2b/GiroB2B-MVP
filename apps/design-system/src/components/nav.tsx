export interface NavItem {
  label: string;
  path: string;
  group: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Início",
    items: [{ label: "Overview", path: "", group: "Início" }],
  },
  {
    label: "Tokens",
    items: [
      { label: "Cores", path: "tokens/colors", group: "Tokens" },
      { label: "Tipografia", path: "tokens/typography", group: "Tokens" },
      { label: "Spacing", path: "tokens/spacing", group: "Tokens" },
      { label: "Radius", path: "tokens/radius", group: "Tokens" },
      { label: "Shadow", path: "tokens/shadow", group: "Tokens" },
      { label: "Motion", path: "tokens/motion", group: "Tokens" },
    ],
  },
  {
    label: "Primitivos",
    items: [
      // Fase 3 — preenche quando refatorar components/ui
      // { label: "Button", path: "primitives/button", group: "Primitivos" },
    ],
  },
  {
    label: "Patterns",
    items: [
      // Fase 3
    ],
  },
  {
    label: "Fluxos",
    items: [
      // Réplicas visuais dos 7 fluxos (input: docs/casos-de-uso.md)
    ],
  },
];

interface NavProps {
  current: string;
}

export function Nav({ current }: NavProps) {
  return (
    <nav
      className="w-64 fixed top-0 left-0 h-screen overflow-y-auto px-6 py-6"
      style={{
        background: "var(--surface-raised)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      <a href="#/" className="flex items-baseline gap-2 mb-8">
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--brand-700)" }}
        >
          GiroB2B
        </span>
        <span
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: "var(--ink-muted)" }}
        >
          DS
        </span>
      </a>

      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-6">
          <p
            className="text-[10px] uppercase tracking-widest font-bold mb-2"
            style={{ color: "var(--ink-muted)" }}
          >
            {group.label}
          </p>
          {group.items.length === 0 ? (
            <p
              className="text-xs italic"
              style={{ color: "var(--ink-subtle)" }}
            >
              em breve (Fase 3)
            </p>
          ) : (
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.path === current;
                return (
                  <li key={item.path}>
                    <a
                      href={`#/${item.path}`}
                      className="block px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                      style={{
                        background: active ? "var(--surface-brand-soft)" : "transparent",
                        color: active ? "var(--ink-brand)" : "var(--ink-secondary)",
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      <div
        className="mt-12 pt-6 text-xs"
        style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--ink-muted)" }}
      >
        <p className="mb-2">
          <strong style={{ color: "var(--ink-secondary)" }}>Fonte:</strong>
          <br />
          <code>packages/shared/src/design/tokens.css</code>
        </p>
        <p>
          <strong style={{ color: "var(--ink-secondary)" }}>Doc:</strong>
          <br />
          <code>docs/design-system.md</code>
        </p>
      </div>
    </nav>
  );
}
