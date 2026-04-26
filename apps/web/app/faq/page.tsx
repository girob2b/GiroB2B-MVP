import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Perguntas Frequentes",
  description: "FAQ do GiroB2B — como funciona a plataforma B2B brasileira.",
};

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "O que é o GiroB2B?",
    a: (
      <>
        É um marketplace que conecta <strong>compradores corporativos</strong> a{" "}
        <strong>fornecedores B2B brasileiros</strong> de qualquer setor. Compradores
        publicam o que precisam, fornecedores enviam cotações.
      </>
    ),
  },
  {
    q: "Quanto custa para usar?",
    a: (
      <>
        <strong>Para compradores: 100% gratuito.</strong> Sem mensalidade, sem comissão,
        sem cartão de crédito. Para fornecedores, o cadastro e os recursos do MVP atual
        também são gratuitos. Planos pagos serão introduzidos no futuro com aviso prévio.
      </>
    ),
  },
  {
    q: "Como me cadastro como comprador?",
    a: (
      <>
        Clique em <Link href="/cadastro" className="font-semibold text-[color:var(--brand-primary-700)] hover:underline">Criar conta</Link>,
        informe email e senha, confirme pelo link enviado por email. Pronto — você já pode
        explorar fornecedores e enviar cotações.
      </>
    ),
  },
  {
    q: "Como me cadastro como fornecedor?",
    a: (
      <>
        Após criar conta de comprador, no painel você pode <strong>"virar fornecedor"</strong>:
        informa CNPJ (validamos via BrasilAPI), preenche dados da empresa e cadastra produtos.
      </>
    ),
  },
  {
    q: "Como envio uma cotação?",
    a: (
      <>
        Em qualquer página de produto ou de fornecedor, clique em <strong>"Pedir cotação"</strong>.
        Descreva o que precisa, quantidade e prazo. O fornecedor recebe por email e responde
        diretamente pra você.
      </>
    ),
  },
  {
    q: "Existe limite de cotações?",
    a: (
      <>
        Para evitar spam, cada comprador pode enviar até <strong>10 cotações por dia</strong>{" "}
        no MVP. Cotações repetidas para o mesmo fornecedor em 48h são agrupadas.
      </>
    ),
  },
  {
    q: "Os fornecedores são verificados?",
    a: (
      <>
        Validamos o <strong>CNPJ</strong> de todos os fornecedores via BrasilAPI no momento
        do cadastro. Verificações adicionais (selo "Verificado Premium") chegarão em fases
        posteriores.
      </>
    ),
  },
  {
    q: "Como o GiroB2B usa meus dados?",
    a: (
      <>
        Apenas para fazer a plataforma funcionar (cotações, cadastro, segurança). Não
        vendemos dados a terceiros. Detalhes na{" "}
        <Link href="/privacidade" className="font-semibold text-[color:var(--brand-primary-700)] hover:underline">
          Política de Privacidade
        </Link>.
      </>
    ),
  },
  {
    q: "Como excluo minha conta?",
    a: (
      <>
        Em <strong>Configurações</strong>, escolha "Excluir conta". Sua conta entra em
        soft-delete por 30 dias (recuperável). Após esse prazo, eliminação irreversível.
      </>
    ),
  },
  {
    q: "Tive um problema com um fornecedor / comprador. O que faço?",
    a: (
      <>
        O GiroB2B não é parte da transação comercial entre as empresas. Conflitos comerciais
        devem ser resolvidos diretamente entre vocês. Se houver fraude, golpe ou
        comportamento abusivo, escreva para{" "}
        <a href="mailto:contato@girob2b.com.br" className="font-semibold text-[color:var(--brand-primary-700)] hover:underline">
          contato@girob2b.com.br
        </a>.
      </>
    ),
  },
  {
    q: "Vocês têm app mobile?",
    a: <>Ainda não. A plataforma web é totalmente responsiva e funciona bem em celular.</>,
  },
  {
    q: "Como entro em contato?",
    a: (
      <>
        Suporte geral: <a href="mailto:contato@girob2b.com.br">contato@girob2b.com.br</a>
        <br />
        Privacidade / LGPD: <a href="mailto:privacidade@girob2b.com.br">privacidade@girob2b.com.br</a>
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-primary-700)]">
        Ajuda
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
        Perguntas frequentes
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Não achou o que procurava? Escreva para{" "}
        <a href="mailto:contato@girob2b.com.br" className="text-[color:var(--brand-primary-700)] hover:underline font-semibold">
          contato@girob2b.com.br
        </a>
        .
      </p>

      <dl className="mt-8 space-y-3">
        {FAQ.map(({ q, a }, i) => (
          <details
            key={i}
            className="card-base group p-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-start justify-between gap-3 text-base font-semibold text-slate-900">
              <span>{q}</span>
              <span className="text-[color:var(--brand-primary-600)] transition-transform group-open:rotate-45 text-xl leading-none mt-0.5">
                +
              </span>
            </summary>
            <dd className="mt-3 text-sm leading-relaxed text-slate-600">{a}</dd>
          </details>
        ))}
      </dl>
    </main>
  );
}
