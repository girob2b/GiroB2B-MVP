import { Scale, MapPin, Clock, DollarSign, Star, ArrowLeftRight } from "lucide-react";

export const metadata = { title: "Comparador — GiroB2B" };

const CRITERIA = [
  { icon: DollarSign, label: "Preço", desc: "Preço unitário, por volume e condições de pagamento" },
  { icon: Clock,      label: "Prazo de fabricação", desc: "Lead time de produção até a saída da fábrica" },
  { icon: ArrowLeftRight, label: "Prazo de entrega", desc: "Tempo estimado até chegar no seu endereço" },
  { icon: MapPin,     label: "Distância", desc: "Proximidade geográfica do fornecedor" },
  { icon: Star,       label: "Reputação",   desc: "Avaliações de outros compradores na plataforma" },
];

export default function ComparadorPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-green-700)]">
          Em desenvolvimento
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Comparador</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
          Compare até 3 cotações lado a lado antes de fechar negócio. Preço, prazo, distância
          e reputação — tudo em uma visão clara para você tomar a melhor decisão de compra.
        </p>
      </div>

      {/* Preview do comparador */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[color:var(--brand-green-600)]" />
            <span className="font-semibold text-slate-800 text-sm">Comparação de cotações</span>
            <span className="ml-auto text-xs text-slate-400">0 / 3 selecionadas</span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 h-40 flex flex-col items-center justify-center gap-2 text-slate-400"
              >
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-sm font-bold">
                  {i}
                </div>
                <span className="text-xs text-center px-2">Adicionar cotação</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critérios */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">O que será comparado</h2>
        <div className="space-y-3">
          {CRITERIA.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-[color:var(--brand-green-50)] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[color:var(--brand-green-600)]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota sobre barganha */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Dica:</span> Após comparar, você pode
          abrir o chat com qualquer fornecedor e mencionar a comparação para negociar o preço
          diretamente — tudo dentro da plataforma.
        </p>
      </div>
    </div>
  );
}
