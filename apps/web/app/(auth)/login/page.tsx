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
    <div className="min-h-dvh bg-white lg:grid lg:h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:overflow-hidden">
      <div className="flex min-h-dvh items-center justify-center bg-white px-6 py-8 sm:px-10 lg:h-dvh lg:px-16 xl:px-20">
        <LoginForm feedback={feedback} />
      </div>

      <div className="relative hidden min-h-dvh overflow-hidden bg-[linear-gradient(155deg,var(--brand-green-500)_0%,var(--brand-green-600)_48%,var(--brand-green-700)_100%)] text-white lg:flex lg:h-dvh">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.10),_transparent_24%)]" />
        <div className="absolute inset-y-0 left-0 w-px bg-white/15" />

        <div className="relative flex w-full flex-col justify-between px-12 py-14 xl:px-16 xl:py-16">
          <div className="max-w-xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">GiroB2B</p>
            <h2 className="max-w-lg text-5xl font-semibold leading-[1.02] tracking-tight">
              Uma experiencia de acesso clara, completa e pronta para conversao.
            </h2>
            <p className="max-w-lg text-lg leading-relaxed text-white/78">
              O lado direito apresenta a plataforma. O lado esquerdo concentra login, cadastro e recuperação de acesso sem ruído visual.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {["Login direto", "Cadastro comprador", "Cadastro fornecedor"].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white/92 backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto mt-10 w-full max-w-3xl">
            <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-8 bottom-4 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />

            <div className="relative rounded-[2rem] bg-white/96 p-6 text-slate-950 shadow-[0_38px_90px_rgba(15,23,42,0.25)]">
              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,var(--brand-green-500)_0%,var(--brand-green-600)_100%)] p-6 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                          Giro comercial
                        </p>
                        <p className="mt-4 text-4xl font-semibold tracking-tight">R$ 189.374</p>
                        <p className="mt-2 text-sm text-white/72">Operação centralizada em um só painel.</p>
                      </div>
                      <div className="rounded-2xl bg-white/14 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/70">Crescimento</p>
                        <p className="mt-2 text-2xl font-semibold">+28%</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Leads ativos", "128"],
                      ["Taxa de resposta", "82%"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Jornada inicial
                      </p>
                      <span className="rounded-full bg-[color:var(--brand-green-50)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-green-700)]">
                        Estavel
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        "Login com email e senha",
                        "Acesso com Google",
                        "Recuperação de senha",
                      ].map((item, index) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--brand-green-600)] text-sm font-semibold text-white">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resultado</p>
                    <div className="mt-4 space-y-4">
                      {[
                        ["Acesso concluído", "74%"],
                        ["Cadastros validados", "61%"],
                        ["Suporte resolvido", "49%"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                            <span>{label}</span>
                            <span className="font-medium text-slate-700">{value}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-[color:var(--brand-green-600)]" style={{ width: value }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
