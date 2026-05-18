import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta GiroB2B",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = pickParam(params.error);
  const status = pickParam(params.status);
  const emailParam = pickParam(params.email);
  const defaultEmail =
    typeof emailParam === "string" && emailParam.includes("@") && emailParam.length <= 200
      ? emailParam.trim().toLowerCase()
      : undefined;

  // Sem mensagem especial e sem email pra prefill → abre modal sobre /explorar.
  // Quando vem com ?email= (comprador recorrente da landing), mantém rota dedicada
  // pra mostrar o card "Continuar sem login" + permitir login + cadastro.
  if (!error && !status && !defaultEmail) redirect("/explorar?auth=login");

  let feedback: { kind: "success" | "error"; message: string } | undefined;

  if (error === "link_expirado") {
    feedback = {
      kind: "error",
      message: "O link de acesso expirou ou já foi usado. Solicite um novo para continuar.",
    };
  } else if (status === "senha_atualizada") {
    feedback = {
      kind: "success",
      message: "Sua senha foi atualizada com sucesso. Entre com a nova senha.",
    };
  } else if (status === "email_confirmado") {
    feedback = {
      kind: "success",
      message: "Seu email foi confirmado. Agora você já pode entrar na plataforma.",
    };
  } else if (status === "cadastro_concluido") {
    feedback = {
      kind: "success",
      message: "Cadastro concluído com sucesso. Faça seu primeiro login para continuar.",
    };
  }

  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginForm feedback={feedback} defaultEmail={defaultEmail} />
      </div>
    </div>
  );
}
