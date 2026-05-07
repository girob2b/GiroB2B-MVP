import { redirect } from "next/navigation";

/**
 * /explorar/[categoria] (PIVOT 2026-05-07): redireciona para /categoria/[slug].
 *
 * Antes era listagem SSR/ISR de produtos por categoria. O reverse marketplace
 * troca produtos por necessidades — a nova página vive em /categoria/[slug].
 */
export default async function ExplorarCategoriaRedirect({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  redirect(`/categoria/${categoria}`);
}
