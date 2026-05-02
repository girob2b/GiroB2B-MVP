"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export type NeedStatus = "pending" | "in_progress" | "fulfilled" | "rejected";
type NeedStatusInput = NeedStatus | "registered" | "cadastrado";

export interface AdminSearchNeed {
  id: string;
  user_id: string;
  query: string;
  description: string | null;
  filters: Record<string, unknown> | null;
  status: NeedStatusInput;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by_supplier_id: string | null;
  buyer_name?: string | null;
  buyer_company?: string | null;
  buyer_email?: string | null;
}

const STATUS_LABEL: Record<NeedStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  fulfilled: "Cadastrado",
  rejected: "Rejeitado",
};

const STATUS_STYLES: Record<NeedStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  fulfilled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-slate-100 text-slate-600 border-slate-200",
};

interface Props {
  initialNeeds: AdminSearchNeed[];
}

const NEXT_STATUS_OPTIONS: Array<{ value: "pending" | "in_progress" | "cadastrado" | "rejected"; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "cadastrado", label: "Cadastrado" },
  { value: "rejected", label: "Rejeitado" },
];

function normalizeNeedStatus(status: NeedStatusInput): NeedStatus {
  if (status === "registered" || status === "cadastrado") return "fulfilled";
  return status;
}

function normalizeNeed(need: AdminSearchNeed): AdminSearchNeed & { status: NeedStatus } {
  return {
    ...need,
    status: normalizeNeedStatus(need.status),
  };
}

export default function NeedsAdminList({ initialNeeds }: Props) {
  const [needs, setNeeds] = useState<Array<AdminSearchNeed & { status: NeedStatus }>>(
    initialNeeds.map(normalizeNeed)
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NeedStatus | "all">("all");

  const filtered = statusFilter === "all" ? needs : needs.filter((n) => n.status === statusFilter);

  async function updateNeed(id: string, patch: Partial<Pick<AdminSearchNeed, "status" | "admin_notes">>) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/needs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `Erro ${res.status}`);
      }
      const { need } = (await res.json()) as { need: AdminSearchNeed };
      const normalizedNeed = normalizeNeed(need);
      setNeeds((prev) => prev.map((n) => (n.id === id ? normalizedNeed : n)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao atualizar");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {(["all", "pending", "in_progress", "fulfilled", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full border font-semibold ${
              statusFilter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}
            {" "}
            <span className="opacity-70">
              ({s === "all" ? needs.length : needs.filter((n) => n.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Nenhuma necessidade neste filtro.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((need) => (
            <li
              key={need.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <header className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[need.status]}`}
                    >
                      {STATUS_LABEL[need.status]}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(need.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{need.query}</h3>
                  {need.description && (
                    <p className="text-xs text-slate-600 whitespace-pre-line">{need.description}</p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Comprador: {need.buyer_name ?? "Nao informado"}
                    {need.buyer_company ? ` - ${need.buyer_company}` : ""}
                    {need.buyer_email ? ` (${need.buyer_email})` : ""}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Criado em {new Date(need.created_at).toLocaleString("pt-BR")} - Atualizado em{" "}
                    {new Date(need.updated_at).toLocaleString("pt-BR")}
                  </p>
                  {need.filters && Object.keys(need.filters).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Object.entries(need.filters).map(([k, v]) =>
                        v ? (
                          <span
                            key={k}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            {k}: {String(v)}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
                <select
                  value={need.status}
                  disabled={savingId === need.id}
                  onChange={(e) =>
                    updateNeed(need.id, { status: e.target.value as NeedStatusInput })
                  }
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  {NEXT_STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </header>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900">
                  Notas internas
                </summary>
                <textarea
                  defaultValue={need.admin_notes ?? ""}
                  rows={3}
                  placeholder="Anote o que foi feito / link do supplier cadastrado..."
                  className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== (need.admin_notes ?? "")) {
                      void updateNeed(need.id, { admin_notes: val || null });
                    }
                  }}
                />
              </details>

              {savingId === need.id && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> salvando...
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
