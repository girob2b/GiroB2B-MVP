"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/actions/supplier";

export interface PublicProfileSupplier {
  id: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  founded_year: number | null;
  employee_count: string | null;
  operating_hours: string | null;
  categories: string[] | null;
  photos: string[] | null;
  profile_completeness: number;
  // Campos repassados pra updateProfile (server action recebe o form inteiro;
  // omitir esses faria a action zerar com null no backend).
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

const EMPLOYEE_OPTIONS = [
  { value: "1-5",     label: "1 a 5 funcionários" },
  { value: "6-10",    label: "6 a 10 funcionários" },
  { value: "11-50",   label: "11 a 50 funcionários" },
  { value: "51-200",  label: "51 a 200 funcionários" },
  { value: "201-500", label: "201 a 500 funcionários" },
  { value: "500+",    label: "Mais de 500 funcionários" },
];

interface Props {
  supplier: PublicProfileSupplier;
  rootCategories: CategoryRow[];
  subCategories: CategoryRow[];
}

export default function PublicProfileContentForm({ supplier, rootCategories, subCategories }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

  useEffect(() => {
    if (state.success) toast.success("Perfil público salvo!");
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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Completude do perfil público</span>
            <span className="font-semibold">{supplier.profile_completeness}%</span>
          </div>
          <Progress value={supplier.profile_completeness} className="h-2" />
        </CardContent>
      </Card>

      <form action={formAction} className="space-y-6">
        {/* Hidden inputs pra carregar campos que updateProfile espera no payload —
            sem isso, a action sobrescreveria com null no backend. */}
        <input type="hidden" name="logo_url" value={logoUrl} />
        <input type="hidden" name="phone"    value={supplier.phone    ?? ""} />
        <input type="hidden" name="whatsapp" value={supplier.whatsapp ?? ""} />
        <input type="hidden" name="address"  value={supplier.address  ?? ""} />
        {photos.map((url) => <input key={url} type="hidden" name="photos" value={url} />)}
        {selectedCats.map((id) => <input key={id} type="hidden" name="categories" value={id} />)}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identidade visual</CardTitle>
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
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted hover:border-brand-300 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs"
                >
                  {photoUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" />Adicionar</>}
                </button>
              </div>
              <input ref={photosInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handlePhotoChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sobre a empresa</CardTitle>
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
                <Label htmlFor="founded_year">Ano de fundação</Label>
                <Input id="founded_year" name="founded_year" type="number" min={1800} max={new Date().getFullYear()} placeholder="Ex: 2005" defaultValue={supplier.founded_year ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employee_count">Número de funcionários</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="operating_hours">Horário de funcionamento</Label>
              <Input id="operating_hours" name="operating_hours" placeholder="Ex: Segunda a Sexta, 08h às 18h" defaultValue={supplier.operating_hours ?? ""} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Redes sociais e site</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias de atuação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione uma categoria à esquerda e marque as subcategorias à direita.
            </p>

            <div className="flex rounded-xl border border-border overflow-hidden h-72">
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
                          ? "bg-white text-slate-900 font-semibold border-brand-600"
                          : "text-slate-600 hover:bg-white hover:text-slate-900 border-transparent",
                      ].join(" ")}
                    >
                      <span className="truncate">{root.name}</span>
                      {selectedCount > 0 && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
                          {selectedCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

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
                          className="w-4 h-4 rounded border-slate-300 accent-brand-600"
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
                            className="w-4 h-4 rounded border-slate-300 accent-brand-600"
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
                      className="flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1 font-medium"
                    >
                      {label}
                      <button type="button" onClick={() => toggleCat(id)} className="hover:text-brand-900 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending} className="btn-primary h-11 px-10 rounded-xl font-bold min-w-32">
            {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {pending ? "Salvando..." : "Salvar perfil público"}
          </Button>
        </div>
      </form>
    </div>
  );
}
