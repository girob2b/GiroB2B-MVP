import { redirect } from "next/navigation";

/** O cadastro de fornecedor foi unificado.
 *  O segmento (comprador/fornecedor) é escolhido no onboarding,
 *  após o primeiro login. */
export default function RegistroPage() {
  redirect("/cadastro");
}
