import { Globe, Share2, Smartphone, Star, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Meu Perfil — GiroB2B" };

const FEATURES = [
  {
    icon: Globe,
    title: "Página web pública",
    desc: "Uma URL própria da sua empresa — compartilhável por WhatsApp, email ou LinkedIn.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    desc: "Experiência perfeita em celular para que compradores consultem no campo ou na fábrica.",
  },
  {
    icon: Star,
    title: "Catálogo completo",
    desc: "Todos os seus produtos, preços e condições exibidos de forma elegante e profissional.",
  },
  {
    icon: Share2,
    title: "Dados da empresa",
    desc: "CNPJ, localização, segmentos atendidos, capacidade produtiva e canais de contato.",
  },
];

export default async function MeuPerfilPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("trade_name, slug, logo_url")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!supplier) redirect("/painel/perfil");

  const publicUrl = `/fornecedor/${supplier.slug}`;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Meu Perfil Público</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
          Seu perfil público é a vitrine da sua empresa na plataforma. É uma página web
          completa que você pode compartilhar como se fosse um mini-site — apresentável,
          mobile e com catálogo integrado.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            render={<Link href={publicUrl} target="_blank" />}
            className="btn-primary rounded-xl h-11 px-6"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir meu perfil público
          </Button>
          <Button
            render={<Link href="/painel/perfil" />}
            className="btn-secondary rounded-xl h-11 px-6"
          >
            Editar perfil
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="h-24 bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)]" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl border-4 border-white bg-[color:var(--brand-green-100)] flex items-center justify-center text-[color:var(--brand-green-700)] font-bold text-xl shadow-sm">
              {(supplier.trade_name ?? "G").slice(0, 1).toUpperCase()}
            </div>
            <div className="pb-1 min-w-0">
              <p className="font-bold text-slate-900 text-lg leading-tight truncate">{supplier.trade_name}</p>
              <p className="text-sm text-slate-500 truncate">{publicUrl}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded-full bg-slate-100" />
            <div className="h-3 w-1/2 rounded-full bg-slate-100" />
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-50 border border-border" />
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-400 text-center">Pré-visualização do perfil público</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-white p-5 space-y-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-green-50)] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[color:var(--brand-green-600)]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800">{title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[color:var(--brand-green-100)] flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-[color:var(--brand-green-600)]" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-[color:var(--brand-green-900)]">
                Configure os blocos do seu perfil
              </p>
              <p className="text-sm text-[color:var(--brand-green-800)] mt-1">
                Dentro do editor de perfil, você consegue organizar os blocos (arrastar/ocultar) do seu perfil público.
              </p>
            </div>
            <Button
              render={<Link href="/painel/perfil" />}
              className="bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-white hover:opacity-90"
              size="sm"
            >
              Abrir editor do perfil
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
