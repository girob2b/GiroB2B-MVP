import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o GiroB2B coleta, usa e protege seus dados pessoais (LGPD).",
};

const ULTIMA_REVISAO = "25 de abril de 2026";

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 prose prose-slate prose-headings:tracking-tight">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-primary-700)]">
        Política de privacidade
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Como tratamos seus dados pessoais</h1>
      <p className="text-sm text-slate-500">Última revisão: {ULTIMA_REVISAO}</p>

      <p className="mt-6 text-sm text-slate-600">
        Esta política descreve como a <strong>GIROB2B PLATAFORMA DE NEGÓCIOS DIGITAIS INOVA SIMPLES (I.S.)</strong>,
        CNPJ 65.542.877/0001-50, trata seus dados pessoais em conformidade com a{" "}
        <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        O GiroB2B é o <strong>controlador</strong> dos seus dados pessoais (Art. 5, V da LGPD).
        Para questões de privacidade: <a href="mailto:privacidade@girob2b.com.br">privacidade@girob2b.com.br</a>.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Dados de cadastro:</strong> nome, email, telefone (opcional), cidade, estado.
        </li>
        <li>
          <strong>Dados empresariais</strong> (fornecedores): CNPJ, razão social, endereço comercial,
          ano de fundação, faixa de funcionários, redes sociais, descrição da empresa.
        </li>
        <li>
          <strong>Conteúdo publicado:</strong> produtos, fotos, catálogos PDF, descrições.
        </li>
        <li>
          <strong>Cotações e mensagens:</strong> conteúdo das inquiries enviadas, respostas,
          conversas no chat interno.
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP, user-agent, logs de erro (para depuração e
          segurança).
        </li>
        <li>
          <strong>Dados comportamentais (opcional):</strong> apenas se você consentir via banner
          de cookies — eventos de uso para melhorar a plataforma.
        </li>
      </ul>
      <p>
        <strong>Não coletamos CPF.</strong> A validação de identidade dos fornecedores é feita
        exclusivamente via CNPJ na BrasilAPI.
      </p>

      <h2>3. Para que usamos seus dados</h2>
      <ul>
        <li><strong>Execução de contrato:</strong> criar conta, autenticar, processar cotações, manter perfil público (Art. 7, V).</li>
        <li><strong>Cumprimento legal:</strong> retenção de logs por prazos legais, atendimento à ANPD (Art. 7, II).</li>
        <li><strong>Legítimo interesse:</strong> prevenção a fraude, segurança da plataforma, melhoria do produto (Art. 7, IX).</li>
        <li><strong>Consentimento:</strong> envio de comunicações de marketing e analytics (Art. 7, I) — você pode revogar a qualquer momento.</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>Apenas com prestadores essenciais ao funcionamento, todos sujeitos a contratos de proteção de dados:</p>
      <ul>
        <li><strong>Supabase</strong> — banco de dados e autenticação (USA, com SCCs).</li>
        <li><strong>Vercel</strong> — hospedagem e CDN (USA, com SCCs).</li>
        <li><strong>Resend</strong> — envio de email transacional (USA).</li>
        <li><strong>BrasilAPI</strong> — validação de CNPJ (Brasil).</li>
      </ul>
      <p>Não vendemos seus dados a terceiros.</p>

      <h2>5. Seus direitos (Art. 18 da LGPD)</h2>
      <ul>
        <li>Confirmação da existência de tratamento</li>
        <li>Acesso aos dados</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade</li>
        <li>Portabilidade dos dados</li>
        <li>Eliminação dos dados pessoais tratados com consentimento</li>
        <li>Informação sobre compartilhamento com terceiros</li>
        <li>Revogação do consentimento</li>
      </ul>
      <p>
        Para exercer qualquer direito, escreva para{" "}
        <a href="mailto:privacidade@girob2b.com.br">privacidade@girob2b.com.br</a>.
        Responderemos em até <strong>15 dias úteis</strong>.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li><strong>Dados de conta:</strong> enquanto a conta estiver ativa.</li>
        <li><strong>Conta excluída:</strong> 30 dias em soft-delete (recuperável), depois eliminação irreversível.</li>
        <li><strong>Logs técnicos:</strong> 90 dias.</li>
        <li><strong>Inquiries e mensagens:</strong> 5 anos após a última atividade (prescrição comercial).</li>
        <li><strong>Dados fiscais (quando aplicável):</strong> 5 anos (legislação tributária).</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        Usamos cookies essenciais (login, sessão, preferências) sem necessidade de consentimento.
        Cookies analíticos e de marketing exigem consentimento explícito via banner de cookies —
        você pode personalizar a qualquer momento.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Aplicamos medidas técnicas e organizacionais razoáveis: criptografia em trânsito (TLS),
        autenticação forte, isolamento por tenant, logs de auditoria, e Row Level Security no banco.
        Em caso de incidente que represente risco aos titulares, comunicaremos a ANPD e os
        afetados em prazo razoável (Art. 48).
      </p>

      <h2>9. Crianças e adolescentes</h2>
      <p>
        A plataforma é destinada a maiores de 18 anos representando empresas. Não coletamos
        intencionalmente dados de menores.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Mudanças significativas nesta política serão comunicadas por email ou aviso na plataforma
        com ao menos 15 dias de antecedência.
      </p>

      <h2>11. Encarregado de Proteção de Dados (DPO)</h2>
      <p>
        Em fase de designação formal. Ponto de contato interino: Gustavo, CEO —{" "}
        <a href="mailto:privacidade@girob2b.com.br">privacidade@girob2b.com.br</a>.
      </p>

      <hr className="my-8" />
      <p className="text-xs text-slate-500">
        Documento elaborado pela equipe GiroB2B com base no framework interno de compliance LGPD.
        Pendente de revisão jurídica formal por advogado especializado em proteção de dados.
        Veja também os <Link href="/termos" className="text-[color:var(--brand-primary-700)] hover:underline font-semibold">Termos de Uso</Link>.
      </p>
    </main>
  );
}
