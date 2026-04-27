"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePublicProfileLayout } from "@/app/actions/supplier";

type PublicBlockKey = "hero" | "about" | "gallery" | "products" | "contact";
type PublicBlock = { key: PublicBlockKey; enabled: boolean };

const DEFAULT_PUBLIC_LAYOUT: PublicBlock[] = [
  { key: "hero",     enabled: true },
  { key: "about",    enabled: true },
  { key: "gallery",  enabled: true },
  { key: "products", enabled: true },
  { key: "contact",  enabled: true },
];

const PUBLIC_BLOCK_LABELS: Record<PublicBlockKey, string> = {
  hero:     "Topo (logo + nome)",
  about:    "Sobre a empresa",
  gallery:  "Galeria de fotos",
  products: "Produtos em destaque",
  contact:  "Contato e redes",
};

interface Props {
  supplierSlug: string;
  initialLayout: unknown;
}

export default function PublicProfileLayoutForm({ supplierSlug, initialLayout }: Props) {
  const [state, formAction, pending] = useActionState(updatePublicProfileLayout, {});

  useEffect(() => {
    if (state.success) toast.success("Layout do perfil público salvo!");
    if (state.error) toast.error(state.error);
  }, [state]);

  const [publicLayout, setPublicLayout] = useState<PublicBlock[]>(() => {
    const normalize = (value: unknown): PublicBlock[] | null => {
      if (!Array.isArray(value)) return null;
      const next: PublicBlock[] = [];
      for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const record = item as { key?: unknown; enabled?: unknown };
        const key = record.key;
        const enabled = record.enabled;
        if (key === "hero" || key === "about" || key === "gallery" || key === "products" || key === "contact") {
          next.push({ key, enabled: enabled !== false });
        }
      }
      return next.length ? next : null;
    };
    const direct = normalize(initialLayout);
    if (direct) return direct;
    if (typeof initialLayout === "string") {
      try { const p = normalize(JSON.parse(initialLayout)); if (p) return p; } catch {}
    }
    return DEFAULT_PUBLIC_LAYOUT;
  });

  const [dragKey, setDragKey] = useState<PublicBlockKey | null>(null);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="public_profile_layout" value={JSON.stringify(publicLayout)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Layout do perfil público</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              render={<Link href={`/fornecedor/${supplierSlug}`} target="_blank" />}
              className="btn-secondary rounded-xl h-10 px-4"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver meu perfil público
            </Button>
            <p className="text-xs text-muted-foreground">
              Arraste os blocos para reordenar a página pública. Use o botão à direita pra mostrar/ocultar.
            </p>
          </div>

          <div className="space-y-2">
            {publicLayout.map((block) => (
              <div
                key={block.key}
                draggable
                onDragStart={() => setDragKey(block.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragKey || dragKey === block.key) return;
                  setPublicLayout((prev) => {
                    const from = prev.findIndex((b) => b.key === dragKey);
                    const to   = prev.findIndex((b) => b.key === block.key);
                    if (from === -1 || to === -1) return prev;
                    const next = [...prev];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    return next;
                  });
                  setDragKey(null);
                }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="text-slate-400"><GripVertical className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">{PUBLIC_BLOCK_LABELS[block.key]}</div>
                  <div className="text-[11px] text-slate-500">{block.enabled ? "Visível no perfil público" : "Oculto no perfil público"}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicLayout((prev) => prev.map((b) => b.key === block.key ? { ...b, enabled: !b.enabled } : b))}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold"
                >
                  {block.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {block.enabled ? "Mostrar" : "Ocultar"}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="btn-primary h-11 px-10 rounded-xl font-bold min-w-32">
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {pending ? "Salvando..." : "Salvar layout"}
        </Button>
      </div>
    </form>
  );
}
