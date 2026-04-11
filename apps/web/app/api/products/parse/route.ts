import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const VALID_UNITS = new Set([
  "unidade", "par", "caixa", "caixa com 12", "caixa com 24",
  "fardo", "kg", "g", "litro", "ml", "metro", "m²", "m³",
  "pallet", "tonelada", "dúzia", "pacote",
]);

function parseNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let wb: XLSX.WorkBook;

  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o arquivo. Use o modelo baixado (.xlsx)." },
      { status: 422 }
    );
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  // Pular linha de instrução se a primeira célula começa com "INSTRUÇÕES"
  const rows = json.filter((row) => !String(Object.values(row)[0] ?? "").startsWith("INSTRUÇÕES"));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Planilha vazia." }, { status: 422 });
  }

  const parsed = rows.map((raw, index) => {
    const nome = String(raw["nome*"] ?? raw["nome"] ?? "").trim();
    const descricao = raw["descricao"] ? String(raw["descricao"]).trim() : null;
    const categoria = raw["categoria"] ? String(raw["categoria"]).trim() : null;
    const unidade = raw["unidade"] ? String(raw["unidade"]).trim().toLowerCase() : null;
    const pedido_minimo = parseNum(raw["pedido_minimo"]);
    const preco_min = parseNum(raw["preco_min_r$"] ?? raw["preco_min_R$"] ?? raw["preco_min"]);
    const preco_max = parseNum(raw["preco_max_r$"] ?? raw["preco_max_R$"] ?? raw["preco_max"]);
    const tags = raw["tags"] ? String(raw["tags"]).trim() : null;
    const statusRaw = raw["status"] ? String(raw["status"]).trim().toLowerCase() : "active";
    const status = ["active", "paused"].includes(statusRaw) ? statusRaw : "active";

    const errors: string[] = [];
    if (!nome) errors.push("Nome é obrigatório");
    if (unidade && !VALID_UNITS.has(unidade)) errors.push(`Unidade "${unidade}" inválida`);
    if (preco_min != null && preco_max != null && preco_max < preco_min)
      errors.push("Preço máx deve ser ≥ mín");

    return { index, nome, descricao, categoria, unidade, pedido_minimo, preco_min, preco_max, tags, status, errors };
  });

  return NextResponse.json({ rows: parsed });
}
