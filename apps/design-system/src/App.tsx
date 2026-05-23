import { useEffect, useState, type JSX } from "react";
import { Nav, NAV_GROUPS } from "@/components/nav";
import { Overview } from "@/pages/overview";
import { ColorsPage } from "@/pages/tokens/colors";
import { TypographyPage } from "@/pages/tokens/typography";
import { SpacingPage } from "@/pages/tokens/spacing";
import { RadiusPage } from "@/pages/tokens/radius";
import { ShadowPage } from "@/pages/tokens/shadow";
import { MotionPage } from "@/pages/tokens/motion";

const ROUTES: Record<string, () => JSX.Element> = {
  "": Overview,
  "tokens/colors": ColorsPage,
  "tokens/typography": TypographyPage,
  "tokens/spacing": SpacingPage,
  "tokens/radius": RadiusPage,
  "tokens/shadow": ShadowPage,
  "tokens/motion": MotionPage,
};

function getRoute(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return ROUTES[hash] ? hash : "";
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const Page = ROUTES[route] ?? Overview;

  // Title da pagina atual pro header
  const currentItem = NAV_GROUPS
    .flatMap((g) => g.items)
    .find((i) => i.path === route);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--surface)" }}>
      <Nav current={route} />
      <main className="flex-1 ml-64">
        <header
          className="sticky top-0 z-10 px-10 py-5 flex items-baseline justify-between"
          style={{
            background: "var(--surface-raised)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: "var(--ink-muted)" }}
            >
              {currentItem?.group ?? "Overview"}
            </p>
            <h1
              className="text-2xl font-bold mt-1"
              style={{ color: "var(--ink-primary)" }}
            >
              {currentItem?.label ?? "Design System"}
            </h1>
          </div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            local-only · não-deployado · fonte:{" "}
            <code>packages/shared/src/design/tokens.css</code>
          </p>
        </header>
        <div className="px-10 py-8 max-w-5xl">
          <Page />
        </div>
      </main>
    </div>
  );
}
