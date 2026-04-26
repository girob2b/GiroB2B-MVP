import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PipelineBoard, { type PipelineColumn } from "./_components/pipeline-board";

export const metadata = { title: "Pipeline — GiroB2B" };

const SUPPLIER_DEFAULTS = [
  { title: "Novo contato",     color: "blue"   },
  { title: "Proposta enviada", color: "amber"  },
  { title: "Em negociação",    color: "purple" },
  { title: "Venda fechada",    color: "green"  },
  { title: "Perdido",          color: "red"    },
];

const BUYER_DEFAULTS = [
  { title: "Buscando fornecedor",  color: "blue"   },
  { title: "Aguardando proposta",  color: "amber"  },
  { title: "Analisando ofertas",   color: "purple" },
  { title: "Pedido confirmado",    color: "green"  },
  { title: "Entregue",             color: "slate"  },
];

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const userId = auth.user.id;

  const [supplierRes, buyerRes] = await Promise.all([
    supabase.from("suppliers").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  const role = supplierRes.data ? (buyerRes.data ? "both" : "supplier") : "buyer";
  const defaults = role === "buyer" ? BUYER_DEFAULTS : SUPPLIER_DEFAULTS;

  let { data: rawCols } = await supabase
    .from("pipeline_columns")
    .select(`id, title, position, color,
             pipeline_cards (
               id, title, description, contact_name, product_name,
               position, due_date, created_at, inquiry_id, proposal_id, origin
             )`)
    .eq("user_id", userId)
    .order("position");

  if (!rawCols || rawCols.length === 0) {
    const { data: created } = await supabase
      .from("pipeline_columns")
      .insert(defaults.map((d, i) => ({ user_id: userId, ...d, position: i })))
      .select("id, title, position, color");

    rawCols = (created ?? []).map(c => ({ ...c, pipeline_cards: [] }));
  }

  const columns: PipelineColumn[] = (rawCols ?? []).map(col => ({
    ...col,
    pipeline_cards: [...(col.pipeline_cards ?? [])].sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)]">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline Comercial</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize seus contatos e negociações em andamento. Arraste os cards entre as colunas.
        </p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <PipelineBoard initialColumns={columns} />
      </div>
    </div>
  );
}
