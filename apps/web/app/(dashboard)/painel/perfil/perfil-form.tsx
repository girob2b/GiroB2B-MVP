"use client";

import { useActionState, useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/actions/supplier";
import { updatePlatformUsage } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Eye, EyeOff, GripVertical, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
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
  hasBuyer: boolean;
}

const EMPLOYEE_OPTIONS = [
  { value: "1-5",     label: "1 a 5 funcionários" },
  { value: "6-10",    label: "6 a 10 funcionários" },
  { value: "11-50",   label: "11 a 50 funcionários" },
  { value: "51-200",  label: "51 a 200 funcionários" },
  { value: "201-500", label: "201 a 500 funcionários" },
  { value: "500+",    label: "Mais de 500 funcionários" },
];

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

const TABS = [
  { key: "basico",       label: "Básico" },
  { key: "apresentacao", label: "Apresentação" },
  { key: "categorias",   label: "Categorias" },
  { key: "avancado",     label: "Avançado" },
] as const;
type Tab = typeof TABS[number]["key"];

export default function PerfilForm({ supplier, rootCategories, subCategories, hasBuyer }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProfile, {});
  const [activeTab, setActiveTab] = useState<Tab>("basico");

  // Modo de uso da plataforma
  const derivedMode = hasBuyer ? "both" : "supplier";
  const [selectedMode, setSelectedMode] = useState(derivedMode);
  const [modeTransition, startModeTransition] = useTransition();

  useEffect(() => {
    if (state.success) toast.success("Perfil salvo com sucesso!");
    if (state.error) toast.error(state.error);
  }, [state]);

  const [logoUrl, setLogoUrl] = useState<string>(supplier.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>(supplier.photos ?? []);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const [selectedCats, setSelectedCats] = useState<string[]>(supplier.categories ?? []);
  const [activeRoot, setActiveRoot] = useState<string | null>(rootCategories[0]?.id ?? null);

  const [publicLayout, setPublicLayout] = useState<PublicBlock[]>(() => {
    const raw = supplier.public_profile_layout;
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
    const direct = normalize(raw);
    if (direct) return direct;
    if (typeof raw === "string") {
      try { const p = normalize(JSON.parse(raw)); if (p) return p; } catch {}
    }
    return DEFAULT_PUBLIC_LAYOUT;
  });

  const [dragKey, setDragKey] = useState<PublicBlockKey | null>(null);

  async function uploadFile(file: File, bucket: string, pathPrefix: string): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${pathPrefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
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
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  function handleModeChange() {
    if (selectedMode === derivedMode) return;
    startModeTransition(async () => {
      const fd = new FormData();
      fd.append("mode", selectedMode);
      const result = await updatePlatformUsage({}, fd);
      if (result.success) {
        toast.success("Modo de uso atualizado!");
        router.refresh();
      }
      if (result.error) {
        toast.error(result.error);
        setSelectedMode(derivedMode);
      }
    });
  }

  const saveButton = (
    <div className="flex justify-end pt-2">
      <Button type="submit" disabled={pending} className="btn-primary h-11 px-10 rounded-xl font-bold min-w-32">
        {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {pending ? "Salvando..." : "Salvar Perfil"}
      </Button>
    </div>
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Inputs ocultos para arrays */}
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="public_profile_layout" value={JSON.stringify(publicLayout)} />
      {photos.map((url) => <input key={url} type="hidden" name="photos" value={url} />)}
      {selectedCats.map((id) => <input key={id} type="hidden" name="categories" value={id} />)}

      {/* Completude — sempre visível */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Completude do perfil</span>
            <span className="font-semibold">{supplier.profile_completeness}%</span>
          </div>
          <Progress value={supplier.profile_completeness} className="h-2" />
        </CardContent>
      </Card>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-[color:var(--brand-primary-600)] text-[color:var(--brand-primary-600)]"
                : "border-transparent text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Básico ── */}
      <div className={activeTab !== "basico" ? "hidden" : "space-y-5"}>
        {/* Banner de identidade — somente leitura */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-slate-50 px-5 py-4">
          <div className="w-12 h-12 rounded-xl bg-[color:var(--brand-green-100)] flex items-center justify-center text-[color:var(--brand-green-700)] font-bold text-xl shrink-0">
            {supplier.trade_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{supplier.trade_name}</p>
            <p className="text-xs text-slate-500 truncate">{supplier.company_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{supplier.city}, {supplier.state} · CNPJ {supplier.cnpj}</p>
          </div>
          <p className="text-xs text-slate-400 text-right shrink-0 leading-relaxed">
            Para alterar,<br />contate o suporte
          </p>
        </div>

        {/* Modo de uso da plataforma */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modo de uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina como você utiliza a plataforma. Isso altera as funcionalidades disponíveis no painel.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { value: "buyer",    label: "Só comprar",      desc: "Encontrar fornecedores e enviar cotações" },
                { value: "supplier", label: "Só vender",       desc: "Receber cotações e gerenciar produtos" },
                { value: "both",     label: "Comprar e vender", desc: "Acesso completo a todas as funcionalidades" },
              ] as const).map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={[
                    "flex flex-col gap-1 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors",
                    selectedMode === value
                      ? "border-[color:var(--brand-primary-600)] bg-[color:var(--brand-primary-50)]"
                      : "border-border hover:border-slate-300 bg-white",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="_mode"
                    value={value}
                    checked={selectedMode === value}
                    onChange={() => setSelectedMode(value)}
                    className="sr-only"
                  />
                  <span className={[
                    "text-sm font-semibold",
                    selectedMode === value ? "text-[color:var(--brand-primary-700)]" : "text-slate-800",
                  ].join(" ")}>
                    {label}
                  </span>
                  <span className="text-xs text-slate-500 leading-relaxed">{desc}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-400">
                {selectedMode !== derivedMode
                  ? "Você tem alterações não salvas no modo de uso."
                  : `Modo atual: ${derivedMode === "both" ? "Comprar e vender" : derivedMode === "supplier" ? "Só vender" : "Só comprar"}`}
              </p>
              <Button
                type="button"
                onClick={handleModeChange}
                disabled={modeTransition || selectedMode === derivedMode}
                className="btn-primary h-9 px-5 rounded-xl text-sm font-semibold"
              >
                {modeTransition ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Atualizando...</> : "Atualizar modo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contato e Operação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contato e Operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone <span className="text-destructive">*</span></Label>
                <Input id="phone" name="phone" placeholder="(11) 99999-9999" defaultValue={supplier.phone ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="(11) 99999-9999" defaultValue={supplier.whatsapp ?? ""} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" placeholder="Rua, número, bairro" defaultValue={supplier.address ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="operating_hours">Horário de Funcionamento</Label>
              <Input id="operating_hours" name="operating_hours" placeholder="Ex: Segunda a Sexta, 08h às 18h" defaultValue={supplier.operating_hours ?? ""} />
            </div>
          </CardContent>
        </Card>

        {saveButton}
      </div>

      {/* ── Tab: Apresentação ── */}
      <div className={activeTab !== "apresentacao" ? "hidden" : "space-y-5"}>

        {/* Mídia: Logo + Fotos juntos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mídia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Logo da empresa</p>
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
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                    {logoUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {logoUploading ? "Enviando..." : "Alterar logo"}
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setLogoUrl("")}>
                      Remover
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG ou JPG, máx. 2MB</p>
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
            </div>

            <div className="border-t border-border" />

            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Fotos da empresa</p>
              <p className="text-xs text-muted-foreground mb-3">Fábrica, equipe ou produtos — aumenta a credibilidade do perfil.</p>
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
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted hover:border-[color:var(--brand-green-300)] transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs"
                >
                  {photoUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" />Adicionar</>}
                </button>
              </div>
              <input ref={photosInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handlePhotoChange} />
            </div>
          </CardContent>
        </Card>

        {/* Sobre */}
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
                <Input id="founded_year" name="founded_year" type="number" min={1800} max={new Date().getFullYear()} placeholder="Ex: 2005" defaultValue={supplier.founded_year ?? ""} />
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
                  {EMPLOYEE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Redes Sociais e Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="website">Site</Label>
              <Input id="website" name="website" type="url" placeholder="https://www.suaempresa.com.br" defaultValue={supplier.website ?? ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" name="instagram" placeholder="@suaempresa" defaultValue={supplier.instagram ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/company/..." defaultValue={supplier.linkedin ?? ""} />
              </div>
            </div>
          </CardContent>
        </Card>

        {saveButton}
      </div>

      {/* ── Tab: Categorias ── */}
      <div className={activeTab !== "categorias" ? "hidden" : "space-y-5"}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias de Atuação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione uma categoria à esquerda e marque as subcategorias à direita.
            </p>

            {/* Two-panel picker */}
            <div className="flex rounded-xl border border-border overflow-hidden h-72">
              {/* Painel esquerdo — categorias raiz */}
              <div className="w-44 shrink-0 border-r border-border overflow-y-auto bg-slate-50/60">
                {rootCategories.map((root) => {
                  const subs = subCategories.filter((s) => s.parent_id === root.id);
                  const selectedCount = subs.length > 0
                    ? subs.filter((s) => selectedCats.includes(s.id)).length
                    : selectedCats.includes(root.id) ? 1 : 0;
                  const isActive = activeRoot === root.id;

                  return (
                    <button
                      key={root.id}
                      type="button"
                      onClick={() => setActiveRoot(root.id)}
                      className={[
                        "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors border-l-2",
                        isActive
                          ? "bg-white text-slate-900 font-semibold border-[color:var(--brand-primary-600)]"
                          : "text-slate-600 hover:bg-white hover:text-slate-900 border-transparent",
                      ].join(" ")}
                    >
                      <span className="truncate">{root.name}</span>
                      {selectedCount > 0 && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)]">
                          {selectedCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Painel direito — subcategorias */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {activeRoot ? (() => {
                  const subs = subCategories.filter((s) => s.parent_id === activeRoot);
                  const root = rootCategories.find((r) => r.id === activeRoot);

                  if (subs.length === 0) {
                    return (
                      <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCats.includes(activeRoot)}
                          onChange={() => toggleCat(activeRoot)}
                          className="w-4 h-4 rounded border-slate-300 accent-[color:var(--brand-green-600)]"
                        />
                        <span className="text-sm text-slate-800">{root?.name}</span>
                      </label>
                    );
                  }

                  return (
                    <>
                      {subs.map((sub) => (
                        <label key={sub.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCats.includes(sub.id)}
                            onChange={() => toggleCat(sub.id)}
                            className="w-4 h-4 rounded border-slate-300 accent-[color:var(--brand-green-600)]"
                          />
                          <span className="text-sm text-slate-800">{sub.name}</span>
                        </label>
                      ))}
                    </>
                  );
                })() : (
                  <p className="text-sm text-slate-400 p-3">Selecione uma categoria à esquerda.</p>
                )}
              </div>
            </div>

            {/* Chips das selecionadas */}
            {selectedCats.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedCats.map((id) => {
                  const sub  = subCategories.find((s) => s.id === id);
                  const root = sub
                    ? rootCategories.find((r) => r.id === sub.parent_id)
                    : rootCategories.find((r) => r.id === id);
                  const label = sub ? `${root?.name} / ${sub.name}` : (root?.name ?? id);

                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 text-xs bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] border border-[color:var(--brand-green-200)] rounded-full px-3 py-1 font-medium"
                    >
                      {label}
                      <button type="button" onClick={() => toggleCat(id)} className="hover:text-[color:var(--brand-green-900)] transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {saveButton}
      </div>

      {/* ── Tab: Avançado ── */}
      <div className={activeTab !== "avancado" ? "hidden" : "space-y-5"}>
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
              <p className="text-xs text-muted-foreground">
                Arraste os blocos para organizar a página pública (estilo CMS).
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

        {saveButton}
      </div>
    </form>
  );
}
