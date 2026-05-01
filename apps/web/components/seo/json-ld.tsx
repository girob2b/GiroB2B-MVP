/**
 * Wrapper para emitir JSON-LD Schema.org server-side (RF-05.08).
 *
 * Uso:
 *   <JsonLd schema={{ "@type": "Product", name: "...", ... }} />
 *
 * Renderiza um <script type="application/ld+json"> no HTML — Googlebot
 * lê direto sem precisar executar JS. Use em RSC para SEO programático.
 */
interface JsonLdProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ schema }: JsonLdProps) {
  const payload = Array.isArray(schema)
    ? { "@context": "https://schema.org", "@graph": schema.map((s) => ({ "@context": "https://schema.org", ...s })) }
    : { "@context": "https://schema.org", ...schema };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapa aspas/quebras; é seguro pra inline JSON-LD.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
