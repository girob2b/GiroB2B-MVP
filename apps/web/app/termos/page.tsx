import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso da plataforma GiroB2B — marketplace B2B brasileiro.",
};

const ULTIMA_REVISAO = "25 de abril de 2026";

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 prose prose-slate prose-headings:tracking-tight">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-primary-700)]">
        Termos de uso
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Termos de uso da plataforma GiroB2B</h1>
      <p className="text-sm text-slate-500">Última revisão: {ULTIMA_REVISAO}</p>

      <p className="mt-6 text-sm text-slate-600">
        Estes Termos regulam o uso da plataforma GiroB2B operada pela{" "}
        <strong>GIROB2B PLATAFORMA DE NEGÓCIOS DIGITAIS INOVA SIMPLES (I.S.)</strong>,
        CNPJ 65.542.877/0001-50, com sede no Brasil. Ao criar uma conta ou utilizar
        qualquer parte do serviço, você concorda com os termos abaixo.
      </p>

      <h2>1. Sobre a plataforma</h2>
      <p>
        O GiroB2B é um <strong>marketplace de conexão entre empresas</strong> (B2B):
        compradores publicam necessidades, fornecedores cadastram produtos e respondem cotações.
        A plataforma <strong>não é parte das transações comerciais</strong> entre comprador e fornecedor —
        atuamos apenas como facilitador da conexão.
      </p>

      <h2>2. Cadastro</h2>
      <ul>
        <li>O cadastro é gratuito para compradores. Fornecedores podem ter planos pagos no futuro (atualmente todos os recursos do MVP são gratuitos).</li>
        <li>Você se compromete a fornecer informações verdadeiras, completas e atualizadas.</li>
        <li>O acesso é pessoal e intransferível. Você é responsável pela guarda das suas credenciais.</li>
        <li>Para se cadastrar como fornecedor, é necessário CNPJ ativo validado via BrasilAPI.</li>
      </ul>

      <h2>3. Uso aceitável</h2>
      <p>É proibido utilizar a plataforma para:</p>
      <ul>
        <li>Publicar conteúdo falso, enganoso, ilegal, ofensivo ou que viole direitos de terceiros.</li>
        <li>Anunciar produtos ou serviços ilegais, falsificados ou que contrariem normas brasileiras.</li>
        <li>Coletar dados de outros usuários sem consentimento (scraping, automações não autorizadas).</li>
        <li>Tentar burlar mecanismos de segurança, autenticação ou cobrança.</li>
        <li>Enviar spam ou comunicações comerciais não solicitadas em massa.</li>
      </ul>

      <h2>4. Conteúdo publicado pelos usuários</h2>
      <p>
        Você mantém a propriedade intelectual sobre o conteúdo que publicar (descrições de produto,
        imagens, dados da empresa). Ao publicar, você concede ao GiroB2B uma <strong>licença
        não exclusiva, gratuita e mundial</strong> para exibir esse conteúdo na plataforma e em
        canais de divulgação relacionados (busca, mídia social, email transacional).
      </p>

      <h2>5. Suspensão e exclusão</h2>
      <p>
        Reservamo-nos o direito de suspender ou excluir contas que violem estes Termos,
        a legislação aplicável, ou que apresentem indícios de fraude. Quando possível,
        notificaremos antes — em casos urgentes (fraude, ilegalidade), agimos imediatamente.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O GiroB2B oferece a plataforma <strong>&ldquo;como está&rdquo;</strong>. Não garantimos:
      </p>
      <ul>
        <li>Que cada cotação resultará em negócio fechado.</li>
        <li>A veracidade absoluta das informações cadastradas pelos usuários (esforçamo-nos para validar mas dependemos das informações fornecidas).</li>
        <li>Disponibilidade ininterrupta do serviço (manutenções programadas serão comunicadas quando possível).</li>
      </ul>
      <p>
        Conflitos comerciais entre comprador e fornecedor devem ser resolvidos diretamente
        entre as partes. O GiroB2B pode mediar amistosamente, mas não tem responsabilidade
        contratual sobre as transações.
      </p>

      <h2>7. Privacidade e dados pessoais</h2>
      <p>
        O tratamento de dados pessoais é regido pela{" "}
        <Link href="/privacidade" className="font-semibold text-[color:var(--brand-primary-700)] hover:underline">
          Política de Privacidade
        </Link>
        , parte integrante destes Termos.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos alterar estes Termos para refletir evoluções legais, de produto ou operacionais.
        Mudanças significativas serão comunicadas por email ou aviso na plataforma com
        ao menos 15 dias de antecedência.
      </p>

      <h2>9. Foro</h2>
      <p>
        Estes Termos são regidos pela legislação brasileira. Eventuais litígios serão
        dirimidos no foro da comarca de domicílio do usuário.
      </p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: <a href="mailto:contato@girob2b.com.br">contato@girob2b.com.br</a>
      </p>

      <hr className="my-8" />
      <p className="text-xs text-slate-500">
        Documento elaborado pela equipe GiroB2B. Pendente de revisão jurídica.
      </p>
    </main>
  );
}
