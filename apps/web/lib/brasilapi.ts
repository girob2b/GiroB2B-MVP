export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: number;          // 2 = ATIVA, 3 = SUSPENSA, 4 = INAPTA, 8 = BAIXADA
  descricao_situacao_cadastral: string; // "ATIVA" | "BAIXADA" | "SUSPENSA" | "INAPTA" | "NULA"
  municipio: string;
  uf: string;
  natureza_juridica: string;
  descricao_natureza_juridica: string;
  data_inicio_atividade: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
}

export interface CNPJResult {
  valid: boolean;
  data?: CNPJData;
  error?: string;
}

/** Tenta BrasilAPI, faz fallback para ReceitaWS se BrasilAPI estiver indisponível. */
export async function validateCNPJ(cnpj: string): Promise<CNPJResult> {
  const cleaned = cnpj.replace(/\D/g, "");

  if (cleaned.length !== 14) {
    return { valid: false, error: "CNPJ deve ter 14 dígitos." };
  }

  // ── Tentativa 1: BrasilAPI ────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleaned}`,
      { next: { revalidate: 3600 } }
    );

    if (res.status === 404) {
      return { valid: false, error: "CNPJ não encontrado na Receita Federal." };
    }

    if (res.ok) {
      const data: CNPJData = await res.json();
      if (data.situacao_cadastral !== 2) {
        return {
          valid: false,
          error: `CNPJ com situação "${data.descricao_situacao_cadastral}". Apenas CNPJs ativos podem se cadastrar.`,
        };
      }
      return { valid: true, data };
    }
    // BrasilAPI indisponível (5xx, 429…) → tenta fallback
  } catch {
    // erro de rede → tenta fallback
  }

  // ── Tentativa 2: ReceitaWS (fallback) ─────────────────────────────────────
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cleaned}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (res.status === 404) {
      return { valid: false, error: "CNPJ não encontrado na Receita Federal." };
    }

    if (!res.ok) {
      return { valid: false, error: "Erro ao consultar a Receita Federal. Tente novamente em instantes." };
    }

    interface ReceitaWSResponse {
      cnpj: string;
      nome: string;
      fantasia: string;
      situacao: string;        // "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA" | "NULA"
      municipio: string;
      uf: string;
      natureza_juridica: string;
      data_inicio_atividade: string;
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      status: string;          // "OK" | "ERROR"
      message?: string;
    }

    const rw: ReceitaWSResponse = await res.json();

    if (rw.status === "ERROR") {
      return { valid: false, error: rw.message ?? "CNPJ inválido." };
    }
    if (rw.situacao !== "ATIVA") {
      return {
        valid: false,
        error: `CNPJ com situação "${rw.situacao}". Apenas CNPJs ativos podem se cadastrar.`,
      };
    }

    // Normaliza para o formato CNPJData
    const data: CNPJData = {
      cnpj:                          rw.cnpj,
      razao_social:                  rw.nome,
      nome_fantasia:                 rw.fantasia,
      situacao_cadastral:            2,
      descricao_situacao_cadastral:  "ATIVA",
      municipio:                     rw.municipio,
      uf:                            rw.uf,
      natureza_juridica:             rw.natureza_juridica,
      descricao_natureza_juridica:   rw.natureza_juridica,
      data_inicio_atividade:         rw.data_inicio_atividade,
      cep:                           rw.cep,
      logradouro:                    rw.logradouro,
      numero:                        rw.numero,
      bairro:                        rw.bairro,
    };

    return { valid: true, data };
  } catch {
    return {
      valid: false,
      error: "Não foi possível consultar a Receita Federal. Verifique sua conexão.",
    };
  }
}

/** Formata CNPJ: 00000000000000 → 00.000.000/0001-00 */
export function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/** Remove formatação */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}
