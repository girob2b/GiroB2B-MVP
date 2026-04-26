import Image from "next/image";
import Link from "next/link";
import { BookOpen, MapPin } from "lucide-react";

export interface CatalogSupplierRow {
  id: string;
  trade_name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  supplier_type: string | null;
}

interface Props {
  suppliers: CatalogSupplierRow[];
}

const TYPE_LABELS: Record<string, string> = {
  fabricante:   "Fabricante",
  importador:   "Importador",
  distribuidor: "Distribuidor",
  atacado:      "Atacado",
};

export default function CatalogSuppliersSection({ suppliers }: Props) {
  if (suppliers.length === 0) return null;

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[color:var(--brand-green-600)]" />
            Fornecedores com catálogo completo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acesse o portfólio de produtos antes de solicitar cotação
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suppliers.map((s) => (
          <Link
            key={s.id}
            href={`/fornecedor/${s.slug}#catalogo`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-[color:var(--brand-green-200)] transition-all"
          >
            <div className="w-10 h-10 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
              {s.logo_url ? (
                <Image src={s.logo_url} alt={s.trade_name} width={40} height={40} className="w-10 h-10 object-contain" unoptimized />
              ) : (
                <span className="text-slate-400 font-bold text-sm">{s.trade_name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.trade_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {(s.city || s.state) && (
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {[s.city, s.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {s.supplier_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize shrink-0">
                    {TYPE_LABELS[s.supplier_type] ?? s.supplier_type}
                  </span>
                )}
              </div>
            </div>
            <BookOpen className="w-4 h-4 text-[color:var(--brand-green-500)] shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
