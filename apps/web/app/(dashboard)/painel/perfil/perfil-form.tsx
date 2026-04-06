"use client";

import { useActionState, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/actions/supplier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ExternalLink, Eye, EyeOff, GripVertical, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface SupplierRow {
  id: string;
  trade_name: string;
  company_name: string;
  cnpj: string;
  description: string | null;
  logo_url: string | null;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  city: string;
  state: string;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  founded_year: number | null;
  employee_count: string | null;
  operating_hours: string | null;
  categories: string[] | null;
  photos: string[] | null;
  profile_completeness: number;
  plan: string;
  slug: string;
  public_profile_layout?: unknown | null;
}

interface Props {
  supplier: SupplierRow;
  rootCategories: CategoryRow[];
  subCategories: CategoryRow[];
}

const EMPLOYEE_OPTIONS = [
  { value: "1-5", label: "1 a 5 funcionários" },
  { value: "6-10", label: "6 a 10 funcionários" },
  { value: "11-50", label: "11 a 50 funcionários" },
  { value: "51-200", label: "51 a 200 funcionários" },
  { value: "201-500", label: "201 a 500 funcionários" },
  { value: "500+", label: "Mais de 500 funcionários" },
];

type PublicBlockKey = "hero" | "about" | "gallery" | "products" | "contact";
type PublicBlock = { key: PublicBlockKey; enabled: boolean };

const DEFAULT_PUBLIC_LAYOUT: PublicBlock[] = [
  { key: "hero", enabled: true },
  { key: "about", enabled: true },
  { key: "gallery", enabled: true },
  { key: "products", enabled: true },
  { key: "contact", enabled: true },
];

const PUBLIC_BLOCK_LABELS: Record<PublicBlockKey, string> = {
  hero: "Topo (logo + nome)",
  about: "Sobre a empresa",
  gallery: "Galeria de fotos",
  products: "Produtos em destaque",
  contact: "Contato e redes",
};

export default function PerfilForm({ supplier, rootCategories, subCategories }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

  // Logo upload
  const [logoUrl, setLogoUrl] = useState<string>(supplier.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Photos upload
  const [photos, setPhotos] = useState<string[]>(supplier.photos ?? []);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photosInputRef = useRef<HTMLInputElement>(null);

  // Selected categories
  const [selectedCats, setSelectedCats] = useState<string[]>(supplier.categories ?? []);

  const [publicLayout, setPublicLayout] = useState<PublicBlock[]>(() => {
    const raw = supplier.public_profile_layout;
    const normalized = (value: unknown): PublicBlock[] | null => {
      if (!Array.isArray(value)) return null;
      const next: PublicBlock[] = [];
      for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const key = (item as any).key as string | undefined;
        const enabled = (item as any).enabled;
        if (key === "hero" || key === "about" || key === "gallery" || key === "products" || key === "contact") {
          next.push({ key, enabled: enabled !== false });
        }
      }
      return next.length ? next : null;
    };

    const direct = normalized(raw);
    if (direct) return direct;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        const parsedNormalized = normalized(parsed);
        if (parsedNormalized) return parsedNormalized;
      } catch {}
    }
    return DEFAULT_PUBLIC_LAYOUT;
  });

  const [dragKey, setDragKey] = useState<PublicBlockKey | null>(null);

  async function uploadFile(
    file: File,
    bucket: string,
    pathPrefix: string
  ): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${pathPrefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await uploadFile(file, "supplier-logos", supplier.id);
    if (url) setLogoUrl(url);
    setLogoUploading(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotoUploading(true);
    const urls: string[] = [];
    for (const f of files) {
      const url = await uploadFile(f, "supplier-photos", supplier.id);
      if (url) urls.push(url);
    }
    setPhotos((prev) => [...prev, ...urls]);
    setPhotoUploading(false);
    e.target.value = "";
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  function toggleCat(id: string) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden inputs for arrays */}
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="public_profile_layout" value={JSON.stringify(publicLayout)} />
      {photos.map((url) => (
        <input key={url} type="hidden" name="photos" value={url} />
      ))}
      {selectedCats.map((id) => (
        <input key={id} type="hidden" name="categories" value={id} />
      ))}

      {/* Success / error */}
      {state.success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Perfil salvo com sucesso!
        </div>
      )}
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Completude atual */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Completude do perfil</span>
            <span className="font-semibold">{supplier.profile_completeness}%</span>
          </div>
          <Progress value={supplier.profile_completeness} className="h-2" />
        </CardContent>
      </Card>

      {/* Dados fixos (CNPJ, razão social) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={supplier.trade_name ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={supplier.cnpj ?? ""} disabled className="bg-muted" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Razão Social</Label>
            <Input value={supplier.company_name ?? ""} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={supplier.city ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={supplier.state ?? ""} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Perfil Público</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              render={<Link href={`/fornecedor/${supplier.slug}`} target="_blank" />}
              className="btn-secondary rounded-xl h-10 px-4"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver meu perfil público
            </Button>
            <div className="text-xs text-muted-foreground">
              Arraste os blocos para organizar a página pública (estilo CMS).
            </div>
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
                    const to = prev.findIndex((b) => b.key === block.key);
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
                <div className="text-slate-400">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {PUBLIC_BLOCK_LABELS[block.key]}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {block.enabled ? "Visível no perfil público" : "Oculto no perfil público"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPublicLayout((prev) =>
                      prev.map((b) => (b.key === block.key ? { ...b, enabled: !b.enabled } : b))
                    )
                  }
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

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
                <Image src={logoUrl} alt="Logo" fill className="object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-xs text-center px-1">
                Sem logo
              </div>
            )}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {logoUploading ? "Enviando..." : "Alterar logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setLogoUrl("")}
                >
                  Remover
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG ou JPG, máx. 2MB</p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </CardContent>
      </Card>

      {/* Descrição */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre a Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Descrição <span className="text-muted-foreground text-xs">(mín. 50 caracteres para pontuar)</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva sua empresa, diferenciais, produtos e serviços..."
              rows={5}
              defaultValue={supplier.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="founded_year">Ano de Fundação</Label>
              <Input
                id="founded_year"
                name="founded_year"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                placeholder="Ex: 2005"
                defaultValue={supplier.founded_year ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employee_count">Número de Funcionários</Label>
              <select
                id="employee_count"
                name="employee_count"
                defaultValue={supplier.employee_count ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione...</option>
                {EMPLOYEE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="operating_hours">Horário de Funcionamento</Label>
            <Input
              id="operating_hours"
              name="operating_hours"
              placeholder="Ex: Segunda a Sexta, 08h às 18h"
              defaultValue={supplier.operating_hours ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="(11) 99999-9999"
                defaultValue={supplier.phone ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                placeholder="(11) 99999-9999"
                defaultValue={supplier.whatsapp ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              placeholder="Rua, número, bairro"
              defaultValue={supplier.address ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redes Sociais e Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="website">Site</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://www.suaempresa.com.br"
              defaultValue={supplier.website ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                name="instagram"
                placeholder="@suaempresa"
                defaultValue={supplier.instagram ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                name="linkedin"
                placeholder="https://linkedin.com/company/..."
                defaultValue={supplier.linkedin ?? ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categorias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias de Atuação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione as categorias que melhor descrevem seus produtos e serviços.
          </p>
          <div className="space-y-4">
            {rootCategories.map((root) => {
              const subs = subCategories.filter((s) => s.parent_id === root.id);
              return (
                <div key={root.id}>
                  <button
                    type="button"
                    onClick={() => toggleCat(root.id)}
                    className={[
                      "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 w-full text-left transition-colors",
                      selectedCats.includes(root.id)
                        ? "bg-emerald-50 text-emerald-700"
                        : "hover:bg-muted text-foreground",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                        selectedCats.includes(root.id)
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border",
                      ].join(" ")}
                    >
                      {selectedCats.includes(root.id) && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {root.name}
                  </button>
                  {subs.length > 0 && (
                    <div className="ml-6 mt-1 flex flex-wrap gap-2">
                      {subs.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleCat(sub.id)}
                          className={[
                            "text-xs rounded-full px-3 py-1 border transition-colors",
                            selectedCats.includes(sub.id)
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "border-border text-muted-foreground hover:border-emerald-300",
                          ].join(" ")}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fotos da empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Adicione fotos da sua fábrica, equipe ou produtos para aumentar a credibilidade.
          </p>
          <div className="flex flex-wrap gap-3">
            {photos.map((url) => (
              <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted group">
                <Image src={url} alt="Foto" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => photosInputRef.current?.click()}
              disabled={photoUploading}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted hover:border-emerald-300 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs"
            >
              {photoUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Adicionar
                </>
              )}
            </button>
          </div>
          <input
            ref={photosInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoChange}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="min-w-32">
          {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {pending ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </div>
    </form>
  );
}
