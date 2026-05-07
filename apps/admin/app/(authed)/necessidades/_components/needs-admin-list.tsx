"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export type DemandStatus = "open" | "negotiating" | "fulfilled" | "cancelled" | "expired";

export interface AdminDemand {
  id: string;
  buyer_user_id: string;
  slug: string;
  title: string;
  description: string;
  status: DemandStatus;
  category_id: string | null;
  category_name: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  views_count: number;
  contact_count: number;
  published_at: string;
  expires_at: string;
  buyer_name?: string | null;
  buyer_company?: string | null;
  buyer_email?: string | null;
}

const STATUS_LABEL: Record<DemandStatus, string> = {
  open: "Aberta",
  negotiating: "Em negociação",
  fulfilled: "Resolvida",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_TONE: Record<DemandStatus, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negotiating: "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_OPTIONS: DemandStatus[] = ["open", "negotiating", "fulfilled", "cancelled", "expired"];

interface Props {
  initialItems: AdminDemand[];
}

export default function NecessidadesAdminList({ initialItems }: Props) {
  const [items, setItems] = useState<AdminDemand[]>(initialItems);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DemandStatus | "all">("all");

  const filtered = statusFilter === "all" ? items : items.filter((d) => d.status === statusFilter);

  async function updateStatus(id: string, status: DemandStatus) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/necessidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `Erro ${res.status}`);
      }
      setItems((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao atualizar status");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["all", ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full border font-semibold ${
              statusFilter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {s === "all" ? "Todas" : STATUS_LABEL[s]}{" "}
            <span className="opacity-70">
              ({s === "all" ? items.length : items.filter((d) => d.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Nenhuma necessidade nesse filtro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Comprador</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Local</th>
                <th className="text-left px-4 py-3">Views</th>
                <th className="text-left px-4 py-3">Contatos</th>
                <th className="text-left px-4 py-3">Publicado</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{d.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 max-w-md">{d.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p className="font-medium">{d.buyer_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{d.buyer_company ?? d.buyer_email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.category_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[d.delivery_city, d.delivery_state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{d.views_count}</td>
                  <td className="px-4 py-3 text-slate-700">{d.contact_count}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(d.published_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[d.status]}`}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={d.status}
                        disabled={savingId === d.id}
                        onChange={(e) => updateStatus(d.id, e.target.value as DemandStatus)}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                      {savingId === d.id && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
