import type { DriveStep } from "driver.js";

/**
 * Steps do tutorial primeiro-login.
 *
 * Princípio de psicologia positiva (decisão Vitor 2026-05-24):
 *   - Linguagem que acolhe ("Vamos começar!", "Pronto!"), não cobra
 *     ("Você precisa...", "Não esqueça...").
 *   - Celebra cada passo cumprido.
 *   - Termina convidando pra ação ("Bora publicar?", não "Agora você sabe").
 *
 * Cada step usa selector `[data-tutorial="<id>"]` — os elementos-âncora
 * marcam isso em `dashboard-shell.tsx`. Trocar o seletor = ajustar lá.
 *
 * 3 steps por role — o suficiente pra cobrir o caminho principal sem
 * cansar. Animação default do driver.js (smooth scroll + fade) é leve.
 */

export type TutorialRole = "buyer" | "supplier";

const COMMON_NEXT = "Próximo →";
const COMMON_PREV = "← Voltar";
const COMMON_DONE = "Bora começar!";

export function getTutorialSteps(role: TutorialRole): DriveStep[] {
  if (role === "supplier") return SUPPLIER_STEPS;
  return BUYER_STEPS;
}

// ─── Comprador ───────────────────────────────────────────────────────────────
const BUYER_STEPS: DriveStep[] = [
  {
    element: '[data-tutorial="nav-publicar"]',
    popover: {
      title: "👋 Bem-vindo à GiroB2B!",
      description:
        "<p>Este é o seu botão principal — <strong>publique o que sua empresa precisa comprar</strong>.</p><p>Em 1 minuto, vendedores qualificados começam a te contatar direto pelo WhatsApp.</p>",
      side: "bottom",
      align: "start",
      nextBtnText: COMMON_NEXT,
      showButtons: ["next", "close"],
    },
  },
  {
    element: '[data-tutorial="nav-necessidades"]',
    popover: {
      title: "Suas necessidades vivem aqui",
      description:
        "<p>Tudo que você publicou em um só lugar — quantas pessoas viram, quantas te chamaram no WhatsApp, e o status de cada uma.</p>",
      side: "bottom",
      align: "start",
      nextBtnText: COMMON_NEXT,
      prevBtnText: COMMON_PREV,
    },
  },
  {
    element: '[data-tutorial="account-dropdown"]',
    popover: {
      title: "Suas configurações ficam aqui",
      description:
        "<p>Quando quiser, complete seu perfil (CNPJ, telefone, endereço) e ganhe o <strong>selo Verificado</strong> — suas necessidades aparecem em destaque no feed dos vendedores.</p>",
      side: "bottom",
      align: "end",
      doneBtnText: COMMON_DONE,
      prevBtnText: COMMON_PREV,
    },
  },
];

// ─── Vendedor ────────────────────────────────────────────────────────────────
const SUPPLIER_STEPS: DriveStep[] = [
  {
    element: '[data-tutorial="supplier-search"]',
    popover: {
      title: "👋 Bem-vindo à GiroB2B!",
      description:
        "<p>Este é seu motor principal — <strong>busque por produto, categoria ou especificação</strong> e veja todas as necessidades publicadas pelos compradores.</p>",
      side: "bottom",
      align: "center",
      nextBtnText: COMMON_NEXT,
      showButtons: ["next", "close"],
    },
  },
  {
    element: '[data-tutorial="account-dropdown"]',
    popover: {
      title: "Material de venda, perfil público e assinatura",
      description:
        "<p>Aqui ficam as ferramentas pra você gerenciar sua presença na plataforma.</p><p>Quanto mais completo seu perfil público, maior a chance dos compradores responderem o seu contato.</p>",
      side: "bottom",
      align: "end",
      nextBtnText: COMMON_NEXT,
      prevBtnText: COMMON_PREV,
    },
  },
  {
    element: 'body', // step final sem âncora — popup centralizado
    popover: {
      title: "Pronto! Bora encontrar leads?",
      description:
        "<p>Comece pelas categorias que você atende. Quando achar uma necessidade interessante, é um clique pra contatar o comprador no WhatsApp — sem fricção.</p>",
      side: "over",
      align: "center",
      doneBtnText: COMMON_DONE,
      prevBtnText: COMMON_PREV,
    },
  },
];
