import { redirect } from "next/navigation";

// Rota legada — fundida em /painel/perfil (tab "Conta"). Mantida só pra
// redirecionar links antigos que possam estar circulando.
export default function ConfiguracoesPage() {
  redirect("/painel/perfil");
}
