import { redirect } from "next/navigation";

/**
 * /painel → /painel/explorar.
 *
 * Princípio "facilitar comprador" (project_buyer_friction_principle):
 * Explorar é a porta de entrada da plataforma. O "Início" antigo (cards de
 * status do dia) foi removido pra encurtar o caminho até o user ver valor.
 * Conteúdo original disponível no git history caso se queira reviver.
 */
export default function PainelPage() {
  redirect("/painel/explorar");
}
