"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload, FileText, ImageIcon, Trash2, Pencil, Check, X,
  CheckCircle2, AlertCircle, Loader2, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addCatalogFile, deleteCatalogFile, updateCatalogTitle } from "@/app/actions/catalogs";
import { cn } from "@/lib/utils";

export interface CatalogFile {
  id: string;
  title: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  created_at: string;
}

interface Props {
  supplierId: string;
  files: CatalogFile[];
  hasProducts: boolean;
}

const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const VALID_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  return type === "pdf"
    ? <FileText className="w-5 h-5 text-foreground shrink-0" />
    : <ImageIcon className="w-5 h-5 text-foreground shrink-0" />;
}

export default function CatalogoUploader({ supplierId, files, hasProducts }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingTitle, startSavingTitle] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPresence = hasProducts || files.length > 0;
  const canUpload = files.length < MAX_FILES;

  async function handleFile(file: File) {
    if (!canUpload) {
      setUploadError(`Limite de ${MAX_FILES} arquivos atingido.`);
      return;
    }
    if (!VALID_MIME.includes(file.type)) {
      setUploadError("Formato inválido. Use PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Arquivo muito grande. Máximo 20 MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${supplierId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("supplier-catalogs")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from("supplier-catalogs")
        .getPublicUrl(path);

      const fd = new FormData();
      fd.set("file_url", publicUrl);
      fd.set("file_name", file.name);
      fd.set("file_size", String(file.size));
      fd.set("file_type", file.type.startsWith("image/") ? "image" : "pdf");

      const result = await addCatalogFile({}, fd);
      if (result.error) {
        await supabase.storage.from("supplier-catalogs").remove([path]);
        setUploadError(result.error);
      } else {
        toast.success("Arquivo adicionado ao catálogo!");
        router.refresh();
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Erro no upload. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteCatalogFile(id);
      toast.success("Arquivo removido.");
      router.refresh();
    } catch {
      toast.error("Erro ao remover arquivo.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(file: CatalogFile) {
    setEditingId(file.id);
    setEditingTitle(file.title ?? file.file_name.replace(/\.[^.]+$/, ""));
  }

  function commitEdit(id: string) {
    startSavingTitle(async () => {
      await updateCatalogTitle(id, editingTitle);
      router.refresh();
      setEditingId(null);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">

      {/* Status banner */}
      <div className={cn(
        "flex items-start gap-3 rounded-2xl border px-5 py-4",
        hasPresence
          ? "border-[color:var(--brand-green-200)] bg-[color:var(--brand-green-50)]"
          : "border-amber-200 bg-amber-50"
      )}>
        {hasPresence
          ? <CheckCircle2 className="w-5 h-5 text-[color:var(--brand-green-600)] shrink-0 mt-0.5" />
          : <AlertCircle   className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
        }
        <div>
          <p className={cn("text-sm font-semibold", hasPresence ? "text-[color:var(--brand-green-900)]" : "text-amber-900")}>
            {hasPresence
              ? "Sua empresa está visível para compradores"
              : "Você ainda não aparece nas buscas"}
          </p>
          <p className={cn("text-xs mt-0.5", hasPresence ? "text-[color:var(--brand-green-800)]" : "text-amber-800")}>
            {hasPresence
              ? "Compradores podem encontrar seu perfil e solicitar cotações."
              : "Adicione um catálogo ou pelo menos um produto para aparecer na plataforma."}
          </p>
        </div>
      </div>

      {/* Upload zone */}
      {canUpload ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors cursor-pointer",
            dragOver
              ? "border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)]"
              : uploading
                ? "border-slate-200 bg-slate-50 cursor-not-allowed"
                : "border-slate-200 hover:border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-50)/50]"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-[color:var(--brand-green-500)] animate-spin" />
              <p className="text-sm font-medium text-slate-600">Enviando arquivo...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-[color:var(--brand-green-100)] flex items-center justify-center">
                <Upload className="w-6 h-6 text-[color:var(--brand-green-600)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, JPG, PNG ou WEBP · máx. 20 MB · {files.length}/{MAX_FILES} arquivos
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-600">
            Limite de {MAX_FILES} arquivos atingido. Remova um para adicionar outro.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onInputChange}
      />

      {uploadError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            Arquivos do catálogo ({files.length}/{MAX_FILES})
          </p>
          <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                <FileIcon type={file.file_type} />

                <div className="flex-1 min-w-0">
                  {editingId === file.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(file.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 h-7 rounded-lg border border-[color:var(--brand-green-400)] bg-[color:var(--brand-green-50)] px-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                      />
                      <button
                        onClick={() => commitEdit(file.id)}
                        disabled={savingTitle}
                        className="p-1 text-[color:var(--brand-green-600)] hover:text-[color:var(--brand-green-800)]"
                      >
                        {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {file.title ?? file.file_name}
                      </span>
                      <button
                        onClick={() => startEdit(file)}
                        className="shrink-0 p-0.5 text-slate-300 hover:text-slate-500 transition-colors"
                        title="Renomear"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {file.file_type === "pdf" ? "PDF" : "Imagem"}
                    {file.file_size ? ` · ${formatSize(file.file_size)}` : ""}
                    {" · "}
                    {new Date(file.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver / Baixar"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[color:var(--brand-green-600)] hover:bg-[color:var(--brand-green-50)] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    title="Remover"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === file.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && !uploading && (
        <p className="text-sm text-slate-500 text-center">
          Nenhum arquivo adicionado ainda. Seu catálogo ficará visível no seu perfil público.
        </p>
      )}
    </div>
  );
}
