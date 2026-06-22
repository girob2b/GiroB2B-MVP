"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** URLs já salvas (vinda do server para edição futura — vazio no create). */
  initialUrls?: string[];
  /** Máximo de fotos. Default 3 — bate com schema demands.photos_urls. */
  max?: number;
  /** Nome do field hidden onde grava o JSON pra Server Action ler. */
  fieldName?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = /^image\/(jpeg|png|webp)$/;

function randomFileName(originalName: string): string {
  const ext = originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
  const id = (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  return `${id}.${ext}`;
}

export default function DemandPhotosUploader({
  initialUrls = [],
  max = 3,
  fieldName = "photos_urls_json",
}: Props) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const slotsLeft = max - urls.length;
    if (slotsLeft <= 0) {
      toast.error(`Máximo de ${max} fotos.`);
      return;
    }

    const filtered: File[] = [];
    for (const f of files.slice(0, slotsLeft)) {
      if (!ACCEPTED.test(f.type)) {
        toast.error(`"${f.name}" não é JPG/PNG/WebP.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" passa de 5 MB.`);
        continue;
      }
      filtered.push(f);
    }
    if (filtered.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const uploadedUrls: string[] = [];

    for (const file of filtered) {
      const path = randomFileName(file.name);
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        toast.error(`Falha ao enviar "${file.name}": ${error.message}`);
        continue;
      }

      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      if (pub.publicUrl) uploadedUrls.push(pub.publicUrl);
    }

    if (uploadedUrls.length > 0) {
      setUrls((prev) => [...prev, ...uploadedUrls]);
      toast.success(uploadedUrls.length === 1 ? "Foto enviada." : `${uploadedUrls.length} fotos enviadas.`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeUrl(target: string) {
    setUrls((prev) => prev.filter((u) => u !== target));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={JSON.stringify(urls)} />

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              <Image
                src={url}
                alt="Foto do produto"
                fill
                sizes="120px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white hover:text-destructive transition-colors"
                aria-label="Remover foto"
                title="Remover foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.length < max && (
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 cursor-pointer hover:border-[color:var(--brand-primary-300)] hover:bg-[color:var(--brand-primary-50)]/40 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleSelect}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              <span className="text-xs text-slate-500">Enviando…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                Adicionar foto
              </span>
              <span className="text-[11px] text-slate-500">
                JPG, PNG ou WebP · até 5 MB · {urls.length}/{max} usadas
              </span>
            </>
          )}
        </label>
      )}
    </div>
  );
}
