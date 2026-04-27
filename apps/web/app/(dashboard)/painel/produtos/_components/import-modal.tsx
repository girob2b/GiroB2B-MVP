"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { bulkCreateProducts, type BulkProductRow, type BulkResult } from "@/app/actions/products";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedRow {
  index: number;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  unidade: string | null;
  pedido_minimo: number | null;
  preco_min: number | null;
  preco_max: number | null;
  tags: string | null;
  status: string;
  errors: string[];
}

type Step = "upload" | "preview" | "result";

// ─── Component ───────────────────────────────────────────────────────────────

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  // ── Reset ao fechar ────────────────────────────────────────────────────────
  function handleClose(val: boolean) {
    if (!val) {
      setStep("upload");
      setRows([]);
      setResults([]);
      setParseError(null);
      setIsDragging(false);
    }
    onOpenChange(val);
  }

  // ── Upload / parse via API route ──────────────────────────────────────────
  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|ods)$/i)) {
      setParseError("Envie um arquivo .xlsx, .xls ou .ods.");
      return;
    }
    setParseError(null);
    setParsing(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/parse", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok || json.error) {
        setParseError(json.error ?? "Erro ao processar arquivo.");
        return;
      }

      setRows(json.rows as ParsedRow[]);
      setStep("preview");
    } catch {
      setParseError("Não foi possível processar o arquivo.");
    } finally {
      setParsing(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Importar ──────────────────────────────────────────────────────────────
  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    const payload: BulkProductRow[] = validRows.map((r) => ({
      nome: r.nome,
      descricao: r.descricao,
      categoria: r.categoria,
      unidade: r.unidade,
      pedido_minimo: r.pedido_minimo,
      preco_min: r.preco_min,
      preco_max: r.preco_max,
      tags: r.tags,
      status: r.status,
    }));

    const { results: res } = await bulkCreateProducts(payload);
    setResults(res);
    setImporting(false);
    setStep("result");
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[color:var(--brand-green-600)]" />
            Importar Produtos via Planilha
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Baixe o modelo, preencha e importe até centenas de produtos de uma vez.
          </DialogDescription>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {(["upload", "preview", "result"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-[color:var(--brand-green-600)] text-white"
                    : i < (["upload", "preview", "result"] as Step[]).indexOf(step)
                    ? "bg-[color:var(--brand-green-100)] text-[color:var(--brand-green-700)]"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${step === s ? "text-slate-900" : "text-slate-400"}`}>
                  {s === "upload" ? "Upload" : s === "preview" ? "Revisão" : "Resultado"}
                </span>
                {i < 2 && <ArrowRight className="w-3 h-3 text-slate-300" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* ── Step: upload ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Download template */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-sm text-slate-900">1. Baixe o modelo preenchível</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Planilha com exemplo, instruções e lista de unidades válidas.
                  </p>
                </div>
                <a href="/api/products/template" download>
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                    <Download className="w-4 h-4" />
                    Baixar modelo
                  </Button>
                </a>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !parsing && fileRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed transition-colors ${
                  parsing
                    ? "border-slate-200 bg-slate-50 cursor-wait"
                    : isDragging
                    ? "border-[color:var(--brand-green-500)] bg-[color:var(--brand-green-50)] cursor-copy"
                    : "border-slate-200 bg-slate-50 hover:border-[color:var(--brand-green-400)] hover:bg-[color:var(--brand-green-50)]/40 cursor-pointer"
                }`}
              >
                {parsing ? (
                  <Loader2 className="w-8 h-8 text-[color:var(--brand-green-500)] animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400" />
                )}
                <div className="text-center">
                  <p className="font-semibold text-sm text-slate-700">
                    {parsing ? "Processando arquivo..." : "Arraste o arquivo aqui ou clique para selecionar"}
                  </p>
                  {!parsing && <p className="text-xs text-muted-foreground mt-1">.xlsx · .xls · .ods</p>}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.ods"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Step: preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1.5 rounded-lg px-2.5 bg-green-50 border-green-200 text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validRows.length} válido{validRows.length !== 1 ? "s" : ""}
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 rounded-lg px-2.5 bg-red-50 border-red-200 text-foreground">
                    <XCircle className="w-3.5 h-3.5" />
                    {invalidRows.length} com erro{invalidRows.length !== 1 ? "s" : ""}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground ml-auto">
                  Apenas as linhas válidas serão importadas.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 w-6">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Nome</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Categoria</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Unid.</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Preço mín</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Erros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr
                          key={row.index}
                          className={row.errors.length > 0 ? "bg-red-50/50" : "hover:bg-slate-50"}
                        >
                          <td className="px-3 py-2 text-slate-400">{row.index + 2}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">
                            {row.nome || <span className="text-red-400 italic">vazio</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{row.categoria ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.unidade ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.preco_min != null
                              ? row.preco_min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {row.status === "active" ? "Ativo" : "Pausado"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {row.errors.length > 0 ? (
                              <span className="text-red-600 flex items-start gap-1">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                {row.errors.join("; ")}
                              </span>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {validRows.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Nenhuma linha válida para importar. Corrija os erros na planilha e envie novamente.
                </div>
              )}
            </div>
          )}

          {/* ── Step: result ── */}
          {step === "result" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-3xl font-bold text-green-700">
                    {results.filter((r) => r.ok).length}
                  </p>
                  <p className="text-sm text-green-600 mt-1">Importados com sucesso</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {results.filter((r) => !r.ok).length}
                  </p>
                  <p className="text-sm text-red-500 mt-1">Falharam</p>
                </div>
              </div>

              {results.some((r) => !r.ok) && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">Detalhes dos erros</p>
                  </div>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {results
                      .filter((r) => !r.ok)
                      .map((r) => (
                        <li key={r.index} className="flex items-start gap-2 px-4 py-2 text-xs">
                          <XCircle className="w-3.5 h-3.5 text-foreground mt-0.5 shrink-0" />
                          <span className="font-medium text-slate-700 mr-1">{r.nome}</span>
                          <span className="text-red-600">{r.error}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-between items-center gap-3">
          {step === "upload" && (
            <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-xl">
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                onClick={() => { setStep("upload"); setRows([]); }}
                className="rounded-xl gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Outro arquivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="btn-primary rounded-xl gap-2 min-w-36"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar {validRows.length} produto{validRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </>
          )}

          {step === "result" && (
            <>
              <Button
                variant="ghost"
                onClick={() => { setStep("upload"); setRows([]); setResults([]); }}
                className="rounded-xl gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Nova importação
              </Button>
              <Button onClick={() => handleClose(false)} className="btn-primary rounded-xl">
                Concluir
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
