import { Package, Tag, Truck, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Catálogo — GiroB2B" };

const FEATURES = [
  {
    icon: Package,
    title: "Cadastro de produtos",
    desc: "Adicione produtos com fotos, descrição técnica, variações e preço de tabela.",
  },
  {
    icon: Tag,
    title: "Precificação B2B",
    desc: "Defina faixas de preço por volume, condições de pagamento e descontos por segmento.",
  },
  {
    icon: Truck,
    title: "Logística e entrega",
    desc: "Configure regiões de atendimento, prazo de fabricação e modalidades de frete.",
  },
  {
    icon: Clock,
    title: "Tempo de produção",
    desc: "Informe lead time e capacidade produtiva para que compradores planejem melhor.",
  },
];

export default function CatalogoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-green-700)]">
          Em desenvolvimento
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Catálogo</h1>
        <p className="text-base text-slate-500 leading-relaxed max-w-xl">
          Configure como seus produtos e serviços são apresentados para compradores B2B.
          Seu catálogo vira uma vitrine pública e indexada — compradores encontram você
          na busca da plataforma e no Google.
        </p>
      </div>

      {/* Cards de features */}
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
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA temporário para produtos existentes */}
      <div className="rounded-2xl border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[color:var(--brand-green-100)] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-[color:var(--brand-green-600)]" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-[color:var(--brand-green-900)]">
                Enquanto isso, gerencie seus produtos
              </p>
              <p className="text-sm text-[color:var(--brand-green-800)] mt-1">
                A nova experiência de catálogo está a caminho. Por enquanto, você pode
                adicionar e editar produtos pela área de gestão atual.
              </p>
            </div>
            <Button
              render={<Link href="/painel/produtos" />}
              className="bg-[linear-gradient(135deg,var(--brand-green-600)_0%,var(--brand-green-700)_100%)] text-white hover:opacity-90"
              size="sm"
            >
              Gerenciar produtos
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
