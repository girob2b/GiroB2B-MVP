"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthDialog, type AuthMode } from "./auth-dialog";

const AUTH_PARAM = "auth";

/**
 * Controlador do modal de auth via query param (`?auth=login|register`).
 *
 * Estratégia de URL:
 *  - bookmark/back-button funcionam (state está na URL)
 *  - rotas dedicadas /login e /cadastro continuam funcionando como fallback
 *  - quando o user navegar pra /login ou /cadastro diretamente, este componente
 *    se desativa pra evitar modal duplicado em cima da página
 */
function AuthModalController() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Suprime o modal nas próprias rotas dedicadas (evita modal sobre a página igual).
  const onAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/cadastro" ||
    pathname.startsWith("/cadastro/") ||
    pathname.startsWith("/recuperar-senha") ||
    pathname.startsWith("/redefinir-senha");

  if (onAuthRoute) return null;

  const value = params.get(AUTH_PARAM);
  const mode: AuthMode | null =
    value === "login" ? "login" : value === "register" ? "register" : null;

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete(AUTH_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <AuthDialog
      mode={mode ?? "login"}
      open={mode !== null}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    />
  );
}

/**
 * Wrapper com Suspense — `useSearchParams()` exige isso no Next 16.
 */
export function AuthModalRoot() {
  return (
    <Suspense fallback={null}>
      <AuthModalController />
    </Suspense>
  );
}
