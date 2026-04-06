export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: number;
  descricao_situacao_cadastral: string;
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

export async function validateCNPJ(cnpj: string): Promise<CNPJResult> {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return { valid: false, error: "CNPJ deve ter 14 digitos." };

  const fetchWithTimeout = async (url: string, init?: RequestInit) => {
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(8000),
    });
  };

  try {
    const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
    if (res.status === 404) return { valid: false, error: "CNPJ nao encontrado na Receita Federal." };
    if (res.ok) {
      const data: CNPJData = await res.json() as CNPJData;
      if (data.situacao_cadastral !== 2) {
        return { valid: false, error: `CNPJ com situacao "${data.descricao_situacao_cadastral}".` };
      }
      return { valid: true, data };
    }
  } catch {
    // fallback
  }

  try {
    const res = await fetchWithTimeout(`https://receitaws.com.br/v1/cnpj/${cleaned}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { valid: false, error: "Erro ao consultar a Receita Federal." };

    interface ReceitaWsResponse {
      cnpj: string;
      nome: string;
      fantasia: string;
      situacao: string;
      municipio: string;
      uf: string;
      natureza_juridica: string;
      data_inicio_atividade: string;
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      status: string;
      message?: string;
    }

    const rw = await res.json() as ReceitaWsResponse;
    if (rw.status === "ERROR") return { valid: false, error: rw.message ?? "CNPJ invalido." };
    if (rw.situacao !== "ATIVA") return { valid: false, error: `CNPJ com situacao "${rw.situacao}".` };

    return {
      valid: true,
      data: {
        cnpj: rw.cnpj,
        razao_social: rw.nome,
        nome_fantasia: rw.fantasia,
        situacao_cadastral: 2,
        descricao_situacao_cadastral: "ATIVA",
        municipio: rw.municipio,
        uf: rw.uf,
        natureza_juridica: rw.natureza_juridica,
        descricao_natureza_juridica: rw.natureza_juridica,
        data_inicio_atividade: rw.data_inicio_atividade,
        cep: rw.cep,
        logradouro: rw.logradouro,
        numero: rw.numero,
        bairro: rw.bairro,
      },
    };
  } catch {
    return { valid: false, error: "Nao foi possivel consultar a Receita Federal." };
  }
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
