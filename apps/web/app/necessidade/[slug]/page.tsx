import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Redirect shim — /necessidade/[slug] → /demanda/[slug] (308 Permanent Redirect).
 *
 * The canonical public route was renamed from /necessidade to /demanda (#12 rename).
 * This file preserves SEO equity: any inbound link or crawl of the old URL receives
 * a 308 and is forwarded to the new path. No DB access; redirect fires immediately.
 *
 * DO NOT delete this file — old URLs must remain resolvable (SEO / external links).
 */
export default async function NecessidadeRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/demanda/${slug}`);
}
