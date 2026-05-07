import { redirect } from "next/navigation";

/**
 * /explorar (PIVOT 2026-05-07): redireciona para /buscar.
 *
 * URL antiga preservada como redirect implícito, evitando 404 em links
 * externos enquanto o feed de necessidades vira a única vitrine.
 */
export default function ExplorarRedirect() {
  redirect("/buscar");
}
