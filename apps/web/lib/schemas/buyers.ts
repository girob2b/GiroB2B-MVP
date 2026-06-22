import { z } from "zod";

// Versão do texto de consentimento de EXPOSIÇÃO PÚBLICA do comprador.
// Espelha LGPD_CONSENT_TEXT_VERSION de demands. Trocar quando o texto mudar —
// gravado em buyers.public_profile_consent_text_version pra evidência forense.
export const BUYER_PUBLIC_PROFILE_CONSENT_TEXT_VERSION =
  "buyer-public-profile-v1-2026-06-22";

// Texto exibido ao comprador no toggle de opt-in. A UI deve renderizar
// exatamente este texto ao lado do controle; a versão acima carimba o aceite.
export const BUYER_PUBLIC_PROFILE_CONSENT_TEXT =
  "Autorizo a GiroB2B a exibir publicamente o perfil da minha empresa " +
  "(razão social, setor, cidade/UF e demandas abertas) na vitrine de empresas " +
  "compradoras. Meus dados de contato (e-mail, telefone, WhatsApp, CNPJ e " +
  "endereço) NÃO serão exibidos. Posso revogar este consentimento a qualquer " +
  "momento nas configurações da minha conta.";

// Resultado da Server Action de opt-in (consumido pelo frontend).
export const SetBuyerPublicProfileOptInSchema = z.object({
  opt_in: z.boolean(),
});

export type SetBuyerPublicProfileOptInInput = z.infer<
  typeof SetBuyerPublicProfileOptInSchema
>;
