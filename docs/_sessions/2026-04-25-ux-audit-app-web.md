# UX Audit — App Web (apps/web) — 2026-04-25

> Walkthrough automatizado via Playwright em desktop (1280×800) e mobile (375×812) sobre `http://localhost:3000`.
> Personas: (1) fornecedor PME novo cadastrando; (2) comprador anônimo navegando perfis públicos.
> Screenshots em [`docs/_sessions/2026-04-25-ux-audit-screenshots/`](2026-04-25-ux-audit-screenshots/).

---

## Resumo executivo

| Severidade | # achados |
|---|---|
| 🔴 Crítico | 4 |
| 🟠 Alto | 5 |
| 🟡 Médio | 4 |
| 🟢 Baixo | 3 |

**One thing to fix first:** o cookie banner (`components/cookie-banner.tsx`) está cobrindo o botão `Enviar codigo de verificacao` na primeira visita ao `/cadastro`. É a primeira ação que o usuário precisa fazer, e o CTA está fisicamente bloqueado por um overlay. Bate em conversão antes de qualquer outra coisa importar.

---

## 🔴 Críticos (bloqueiam ou enganam o fluxo)

### C1 · Cookie banner cobre os CTAs principais na primeira visita
**Onde:** `/`, `/explorar`, `/cadastro`, `/login`. [01-explorar-public-desktop.png](2026-04-25-ux-audit-screenshots/01-explorar-public-desktop.png), [02-cadastro-desktop.png](2026-04-25-ux-audit-screenshots/02-cadastro-desktop.png).
**Sintoma:** o `<CookieBanner>` ancora no canto inferior esquerdo cobrindo o botão `Criar conta` (sidebar guest do `/explorar`) e cobrindo o submit `Enviar codigo de verificacao` no formulário de cadastro. O usuário precisa interagir com o banner antes de conseguir fazer a ação principal.
**Causa provável:** posição `fixed` na largura/altura do banner + z-index alto, sem awareness do conteúdo crítico embaixo.
**Fix:** ou (a) reduzir o banner pra uma faixa menor (chip/pill ancorado em uma esquina sem cobrir CTA), ou (b) ancorar bottom-right e estreitar; ou (c) deixar dismissable com X visível desde o primeiro paint.

### C2 · Página pública de fornecedor renderiza tela vazia se todos os blocos do layout estão `enabled:false`
**Onde:** `/fornecedor/[slug]`. [10-fornecedor-publico-desktop.png](2026-04-25-ux-audit-screenshots/10-fornecedor-publico-desktop.png), [`apps/web/app/fornecedor/[slug]/page.tsx:150,461`](../../apps/web/app/fornecedor/[slug]/page.tsx#L150).
**Sintoma:** testei com supplier real `vitor-de-souza-barreto-`. Página retorna 200 com `<div className="min-h-screen bg-slate-50"><div ...></div></div>` sem nenhum conteúdo. O usuário (e o crawler do Google) vê uma tela cinza mudo.
**Causa:** `const layout = normalizeLayout(supplier.public_profile_layout).filter((b) => b.enabled);` — quando o supplier salvou layout com tudo desabilitado, o filter retorna `[]` e o map não renderiza nada. Sem fallback.
**Fix:** garantir que pelo menos `hero` + `contact` sempre renderizem (independente do flag). Ou, se layout vazio, mostrar empty state ("Este fornecedor está concluindo o cadastro. Volte em breve.") com CTA de contato e link "Ver outros fornecedores".

### C3 · Página de fornecedor não tem o bloco `catalogo` no layout legado
**Onde:** `/fornecedor/[slug]` — supplier `vitor-de-souza-barreto-` tem `public_profile_layout` com 5 blocks (`hero, about, gallery, products, contact`) — falta `catalogo`. [`apps/web/app/fornecedor/[slug]/page.tsx:79`](../../apps/web/app/fornecedor/[slug]/page.tsx#L79).
**Sintoma:** layouts salvos antes da feature `catalogo` não recebem o bloco novo. Mesmo se o supplier tem catálogo PDF, ele não aparece na página pública.
**Fix:** `normalizeLayout` deve **mesclar** com `DEFAULT_LAYOUT` — adicionar blocks ausentes no fim com `enabled: true` (ou false, mas ao menos presentes). Garantir que evolução de layout não deixa supplier antigo sem features novas.

### C4 · Submit do cadastro com senhas divergentes não exibe feedback visível
**Onde:** `/cadastro`. [04-cadastro-senhas-diff.png](2026-04-25-ux-audit-screenshots/04-cadastro-senhas-diff.png), [`apps/web/app/(auth)/cadastro/buyer-register-form.tsx:55`](../../apps/web/app/(auth)/cadastro/buyer-register-form.tsx#L55).
**Sintoma:** preenchi senhas diferentes, cliquei submit, **zero feedback visual**. Nenhum toast aparente, sem erro inline no campo, sem network request. O handler `if (password !== confirmPassword) toast.error("As senhas não coincidem")` existe, mas o toast (Sonner, bottom-right) some rápido demais ou some fora do viewport ativo (o usuário olha o form, não o canto).
**Fix:** mostrar erro **inline** abaixo do campo "Confirmar senha" usando `.alert-error` — toast é fraco demais pra erro de validação que precisa ação imediata na própria área do form.

---

## 🟠 Altos (causam confusão real)

### A1 · Texto sem acentos português em strings de UI
**Onde:** ≈9 ocorrências confirmadas, em 4 arquivos:
- `apps/web/app/(auth)/cadastro/buyer-register-form.tsx`: "voce", "codigo de confirmacao", "codigo de verificacao", "Minimo de 8 caracteres", "Ja tem conta?"
- `apps/web/components/cookie-banner.tsx`: "sessao", "comunicacao", "navegacao"
- `apps/web/components/auth/register-modal.tsx`: "voce"
- `apps/web/app/actions/supplier.ts`: "configuracoes"
- `apps/web/app/(dashboard)/painel/explorar/_data/produtos-mock.ts`: "importacao" ×6 (mock — baixo)

**Sintoma:** marca brasileira premium B2B com strings sem acentos passa amadorismo na primeira impressão. [02-cadastro-desktop.png](2026-04-25-ux-audit-screenshots/02-cadastro-desktop.png), [05-cadastro-toast-tentativa.png](2026-04-25-ux-audit-screenshots/05-cadastro-toast-tentativa.png).
**Fix:** sed em todos os arquivos arrumando: `código`, `confirmação`, `verificação`, `mínimo`, `já`, `sessão`, `comunicação`, `navegação`, `você`, `configurações`, `importação`. ~5 min de trabalho.

### A2 · Validação HTML5 nativa do browser em inglês num app PT-BR
**Onde:** `/cadastro` — campo senha. [03-cadastro-validacao-erro.png](2026-04-25-ux-audit-screenshots/03-cadastro-validacao-erro.png).
**Sintoma:** ao digitar senha curta e tentar submeter, aparece tooltip "Please lengthen this text to 8 characters or more (you are currently using 3 characters)". Mensagem em inglês quebra a experiência PT-BR.
**Fix:** validar via JS (sem `required`/`minLength` nos inputs) e mostrar erro inline em PT-BR usando `.alert-error`. Ou usar `setCustomValidity()` em handlers `onInvalid` com mensagens traduzidas.

### A3 · Resíduo da fonte Geist após migração para DM Sans
**Onde:** todas as páginas. Network request `GET /__nextjs_font/geist-latin.woff2 → ERR_ABORTED` em loop.
**Sintoma:** 2 requests de font falham por página. CSS antigo ainda referencia Geist. Performance + console limpo + 404s evitáveis.
**Fix:** procurar por `geist`/`Geist` em todos os imports e CSS de `apps/web/`. Provavelmente `next/font/google` ainda registra a Geist em algum lugar morto.

### A4 · Botão `Criar conta` na sidebar guest do `/explorar` cortado pelo cookie banner
**Onde:** `/explorar`. [01-explorar-public-desktop.png](2026-04-25-ux-audit-screenshots/01-explorar-public-desktop.png).
**Sintoma:** o botão verde-teal "Criar conta" e o link "Já tenho conta" estão sob o cookie banner. Conversão direta de visitor → cadastro fica bloqueada até o usuário fechar o banner. Já mencionado em C1, mas vale o destaque por ser o caminho de conversão principal.

### A5 · Botões custom usam gradient inline ao invés de `.btn-primary` do design system
**Onde:** `apps/web/app/(auth)/cadastro/buyer-register-form.tsx:293`, `apps/web/app/(auth)/recuperar-senha/page.tsx`, e provavelmente outros forms.
**Exemplo:** `bg-[linear-gradient(135deg,var(--brand-green-700)_0%,var(--brand-green-800)_100%)]` — repete o que `.btn-primary` já entrega centralizado. Drift de design system + manutenção custosa.
**Fix:** substituir por `<Button className="btn-primary">` ou `<button className="btn-primary">`.

---

## 🟡 Médios (degradam mas não bloqueiam)

### M1 · Recuperar senha usa "G" plano em vez do GiroLogo B3
**Onde:** `/recuperar-senha` — painel direito. [08-recuperar-senha.png](2026-04-25-ux-audit-screenshots/08-recuperar-senha.png).
**Sintoma:** lateral institucional mostra um quadrado teal com a letra "G" em branco. Não é o anel partido do design system. Reduz consistência visual da marca.
**Fix:** trocar pelo `<GiroLogo variant="dark" iconOnly size={64} />`.

### M2 · Placeholder do search input cortado em mobile
**Onde:** `/explorar` em 375px. [09-explorar-mobile.png](2026-04-25-ux-audit-screenshots/09-explorar-mobile.png).
**Sintoma:** placeholder "Buscar produtos, fornecedores, segm…" — texto cortado feio.
**Fix:** placeholder mais curto em mobile (ex: "Buscar produtos ou fornecedores"), ou via responsive que troca por "Buscar..." em < 640px.

### M3 · MVP_SCOPE desatualizado: features marcadas como "Tier 2 pendente" já existem
**Onde:** [`docs/MVP_SCOPE.md`](../MVP_SCOPE.md) §4.
**Sintoma:** doc lista T2-10 (Login Google) como pendente, mas já está implementado em [`apps/web/app/(auth)/login/login-form.tsx:71`](../../apps/web/app/(auth)/login/login-form.tsx#L71) (`signInWithOAuth provider:"google"`). Login com Cert. A1 também está. Doc desincroniza realidade.
**Fix:** revisar `MVP_SCOPE.md` Tier 2 e marcar o que já está pronto. Tarefa de 10 min.

### M4 · Tela pública de fornecedor mostra logo "MA - HASTES DE CERCA ELÉTRICA" embutida no card
**Onde:** `/produto/[slug]` — bloco "fornecido por". [11-produto-publico-desktop.png](2026-04-25-ux-audit-screenshots/11-produto-publico-desktop.png).
**Sintoma:** supplier `Vitor de Souza Barreto` tem `logo_url` apontando pra uma logo aleatória de outra empresa (HASTES MA). Provavelmente data de teste, mas se aparecer em produção é embaraçoso.
**Fix:** este caso específico é dado de teste — limpar antes de demos. Mais amplamente: validação no upload pra rejeitar logos sem indício de relação com o nome da empresa não é trivial; o que dá é mostrar "Logo do fornecedor" em alt text (já tem) e estar atento na fase de QA de demo.

---

## 🟢 Baixos (polish)

### B1 · Sidebar guest lista itens "Após login" com cadeado
**Onde:** `/` (redireciona pra `/explorar`).
**Sintoma:** "Painel", "Produtos", "Cotações" aparecem com ícone de cadeado em cinza claro. Pode confundir visitante achando que tem acesso ou que precisa pagar pra desbloquear.
**Fix:** ou esconder do visitante, ou substituir por uma seção colapsável "Mais com login" com link único pra cadastro.

### B2 · Página `/painel/comparador` (já redirecionada) — confirmar produção
**Onde:** já corrigido nesta sessão.
**Status:** redireciona pra `/painel`. Validar em prod depois do deploy.

### B3 · Botão "Conhecer fornecedor" em `/produto/[slug]` leva pra página vazia (C2)
**Cross-ref:** sintoma de C2. Se o supplier tem layout vazio, o CTA "Conhecer fornecedor" leva o buyer pra um beco sem saída visual. Resolver C2 resolve isso.

---

## Ações sugeridas (ordenadas)

1. **C1 — cookie banner** (impacto: conversão direta de cadastro)
2. **C4 — feedback inline na validação de senha do cadastro** (impacto: usuário não entende por que clicou e nada aconteceu)
3. **C2 + C3 — fallback e merge no layout do fornecedor público** (impacto: SEO + first impression do supplier-side cadastrado)
4. **A1 — sed nos textos sem acento** (5 min, polish brutal pelo custo)
5. **A2 — validação HTML5 em PT-BR** (impressão de qualidade)
6. **A3 — limpar resíduo Geist** (network + console limpo)
7. **A5 + M1 — alinhar com DESIGN_SYSTEM (`.btn-primary`, `<GiroLogo>`)** (consistência)
8. **M3 — atualizar MVP_SCOPE com features já entregues**
9. **M2 — placeholder responsivo em mobile**
10. **B1 — esconder/colapsar nav "após login" pro guest**

## Não testado nessa rodada (limitações)

- **Onboarding completo (CNPJ → perfil → upload de logo)** — bloqueado pela necessidade de confirmação por email Supabase real. Recomendo: criar conta de teste com email descartável e capturar o fluxo separadamente.
- **Envio de inquiry real** — depende de conta autenticada.
- **Modal "Meu perfil" (ProfileDialog)** — depende de sessão.
- **Pipeline + Chat** — depende de sessão.
- **Página `/painel/comparador`** — já redirecionando, não testada visualmente.

Esses pontos entram naturalmente no **#6/7/8 do plano de polish (smoke test do fluxo crítico)** — próximo item da fila.
