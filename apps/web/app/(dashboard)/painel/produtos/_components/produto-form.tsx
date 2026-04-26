"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X, Package, Globe, MessageSquare as ChatIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface ProductData {
  id?: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit: string | null;
  min_order: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  tags: string[] | null;
  images: string[] | null;
  status: string;
  visibility?: string;
}

interface ProductState {
  error?: string;
  success?: boolean;
}

interface Props {
  action: (prevState: ProductState, formData: FormData) => Promise<ProductState>;
  supplierId: string;
  categories: CategoryRow[];
  defaultValues?: ProductData;
  submitLabel?: string;
}

const UNIT_OPTIONS = [
  "unidade", "par", "caixa", "caixa com 12", "caixa com 24",
  "fardo", "kg", "g", "litro", "ml", "metro", "m²", "m³",
  "pallet", "tonelada", "dúzia", "pacote",
];

export default function ProdutoForm({ action, supplierId, categories, defaultValues, submitLabel = "Salvar" }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();

  const [visibility, setVisibility] = useState(defaultValues?.visibility ?? "global");
  const [images, setImages] = useState<string[]>(defaultValues?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(defaultValues?.id ? "Produto salvo com sucesso!" : "Produto criado!");
      if (!defaultValues?.id) router.push("/painel/produtos");
    }
    if (state.error) toast.error(state.error);
  }, [state, defaultValues?.id, router]);

  const rootCats = categories.filter((c) => !c.parent_id);
  const subCats = categories.filter((c) => !!c.parent_id);

  async function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${supplierId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (!error) {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden image inputs */}
      {images.map((url) => (
        <input key={url} type="hidden" name="images" value={url} />
      ))}

      {/* Fotos */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Fotos do Produto</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            {images.map((url, i) => (
              <div key={url} className="group relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm transition-all hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 text-slate-500 hover:text-red-500 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
                {i === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 text-white text-[10px] font-bold text-center py-1 backdrop-blur-xs">
                    CAPA
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-50)] hover:text-[color:var(--brand-green-700)] transition-all flex flex-col items-center justify-center gap-1.5 group"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Adicionar</span>
                </>
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleImagesChange}
          />
          <div className="flex items-center gap-2 bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] p-3 rounded-xl border border-[color:var(--brand-green-200)] text-xs font-medium">
            <Package className="w-4 h-4 shrink-0" />
            A primeira foto será a capa do seu produto no catálogo.
          </div>
        </CardContent>
      </Card>

      {/* Informações básicas */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Informações do Produto</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Nome do Produto *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Embalagem Plástica 1L Transparente"
              defaultValue={defaultValues?.name ?? ""}
              className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o produto: material, dimensões, aplicações, diferenciais..."
              rows={5}
              defaultValue={defaultValues?.description ?? ""}
              className="border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category_id" className="text-sm font-semibold">Categoria</Label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={defaultValues?.category_id ?? ""}
                className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand-green-500)]"
              >
                <option value="">Selecione...</option>
                {rootCats.map((root) => {
                  const subs = subCats.filter((s) => s.parent_id === root.id);
                  return (
                    <optgroup key={root.id} label={root.name}>
                      <option value={root.id}>{root.name} (geral)</option>
                      {subs.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          &nbsp;&nbsp;{sub.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-sm font-semibold">Unidade de Venda</Label>
              <select
                id="unit"
                name="unit"
                defaultValue={defaultValues?.unit ?? ""}
                className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand-green-500)]"
              >
                <option value="">Selecione...</option>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="min_order" className="text-sm font-semibold">Pedido Mínimo</Label>
              <Input
                id="min_order"
                name="min_order"
                type="number"
                min={1}
                placeholder="Ex: 100"
                defaultValue={defaultValues?.min_order ?? ""}
                className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_min" className="text-sm font-semibold">Preço Mínimo (R$)</Label>
              <Input
                id="price_min"
                name="price_min"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                defaultValue={defaultValues?.price_min_cents != null ? (defaultValues.price_min_cents / 100).toFixed(2) : ""}
                className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_max" className="text-sm font-semibold">Preço Máximo (R$)</Label>
              <Input
                id="price_max"
                name="price_max"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                defaultValue={defaultValues?.price_max_cents != null ? (defaultValues.price_max_cents / 100).toFixed(2) : ""}
                className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-semibold">Tags (palavras-chave)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="Ex: embalagem, plástico, transparente, 1 litro"
              defaultValue={defaultValues?.tags?.join(", ") ?? ""}
              className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-green-500)] focus-visible:ring-[color:var(--brand-green-100)]"
            />
            <p className="text-xs text-muted-foreground ml-1">Separe por vírgula. Ex: embalagem, atacado, plástico.</p>
          </div>

          {defaultValues?.id && (
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-semibold">Status do Produto</Label>
              <select
                id="status"
                name="status"
                defaultValue={defaultValues.status}
                className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand-green-500)]"
              >
                <option value="active">Ativo (visível no catálogo)</option>
                <option value="paused">Pausado (oculto)</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibilidade */}
      <input type="hidden" name="visibility" value={visibility} />
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Visibilidade</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              {
                value: "global",
                label: "Visível globalmente",
                desc: "Aparece nas buscas públicas e atrai compradores que ainda não te conhecem.",
                icon: Globe,
              },
              {
                value: "chat_only",
                label: "Apenas via chat",
                desc: "Produto oculto nas buscas — compartilhado apenas em negociações diretas.",
                icon: ChatIcon,
              },
            ] as const).map(({ value, label, desc, icon: Icon }) => (
              <label
                key={value}
                className={[
                  "flex gap-3 items-start rounded-xl border-2 p-4 cursor-pointer transition-colors",
                  visibility === value
                    ? "border-[color:var(--brand-green-500)] bg-[color:var(--brand-green-50)]"
                    : "border-border hover:border-slate-300 bg-white",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="_visibility_ui"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="sr-only"
                />
                <div className={[
                  "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  visibility === value
                    ? "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)]"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={["text-sm font-semibold", visibility === value ? "text-[color:var(--brand-green-900)]" : "text-slate-800"].join(" ")}>
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/painel/produtos")}
          className="h-11 px-8 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={pending} 
          className="btn-primary h-11 px-10 rounded-xl font-bold min-w-40"
        >
          {pending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
