"use client";

import { useEffect, useRef } from "react";

/**
 * FeedViewTracker — dispara POST /api/supplier/feed-view após o feed renderizar.
 *
 * Por que Client Component e não Server Action?
 *   O RSC de leads/page.tsx lê last_feed_view_at ANTES de responder ao browser.
 *   Se atualizássemos o timestamp no servidor durante o mesmo render, o badge
 *   já apareceria zerado na primeira visita. Ao delegar pro client-side (useEffect),
 *   garantimos: RSC lê valor antigo → badge correto → página chega ao browser →
 *   useEffect atualiza o timestamp → próxima visita parte do novo baseline.
 *
 * Idempotência: chamada única por mount (ref guard). Sem retry — falha silenciosa
 * é aceitável (o badge mostrará um número ligeiramente maior na próxima visita,
 * não um valor errado para o negócio).
 */
export function FeedViewTracker() {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    fetch("/api/supplier/feed-view", { method: "POST" }).catch(() => {
      // Silencioso — falha não afeta a experiência do usuário.
      // O próximo acesso simplesmente mostrará um badge um pouco maior.
    });
  }, []);

  // Sem UI — componente de efeito puro.
  return null;
}
