import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const UNIT_OPTIONS = [
  "unidade", "par", "caixa", "caixa com 12", "caixa com 24",
  "fardo", "kg", "g", "litro", "ml", "metro", "m²", "m³",
  "pallet", "tonelada", "dúzia", "pacote",
];

const CATEGORY_EXAMPLES = [
  "Alimentos e Bebidas",
  "Construção e Reforma",
  "Embalagens",
  "Higiene e Limpeza",
  "Industriais e MRO",
  "Moda e Vestuário",
  "Papelaria e Escritório",
  "Tecnologia",
  "Outros",
];

export async function GET() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Produtos ─────────────────────────────────────────────────────
  const headers = [
    "nome*",
    "descricao",
    "categoria",
    "unidade",
    "pedido_minimo",
    "preco_min_R$",
    "preco_max_R$",
    "tags",
    "status",
  ];

  const exampleRow = [
    "Caixa de Papelão 40x30",
    "Caixa de papelão duplo ondulado, ideal para transporte.",
    "Embalagens",
    "caixa",
    "50",
    "2.50",
    "3.80",
    "embalagem, papelão, transporte",
    "active",
  ];

  const instrucoes = [
    "INSTRUÇÕES:",
    "• nome* é obrigatório.",
    "• status: active ou paused (padrão: active).",
    "• preco_min_R$ e preco_max_R$ em reais com centavos (ex: 12.90).",
    "• tags separadas por vírgula.",
    "• unidade: veja aba Referências.",
    "• categoria: nome exato (opcional).",
    "", "", "", // alinhamento de colunas
  ];

  const ws = XLSX.utils.aoa_to_sheet([instrucoes, headers, exampleRow]);

  // Larguras de coluna
  ws["!cols"] = [
    { wch: 30 }, { wch: 45 }, { wch: 25 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Produtos");

  // ── Sheet 2: Referências ──────────────────────────────────────────────────
  const maxLen = Math.max(UNIT_OPTIONS.length, CATEGORY_EXAMPLES.length);
  const refRows: (string | undefined)[][] = [["Unidades válidas", "Categorias (exemplos)"]];
  for (let i = 0; i < maxLen; i++) {
    refRows.push([UNIT_OPTIONS[i], CATEGORY_EXAMPLES[i]]);
  }

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Referências");

  // ── Serializar e retornar ─────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-produtos-girob2b.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
