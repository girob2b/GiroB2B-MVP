import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas que exigem autenticação */
const PROTECTED_ROUTES = ["/painel", "/comprador", "/admin", "/onboarding"];
/** Rotas que redirecionam para o painel se já estiver logado E com onboarding completo */
const AUTH_ROUTES = ["/login", "/cadastro"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAdminLoginRoute = pathname === "/admin/login";
  const isAdminAreaRoute = pathname.startsWith("/admin") && !isAdminLoginRoute;

  // 1. Não autenticado tentando acessar área protegida
  const isProtected =
    PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) && !isAdminLoginRoute;
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isAdminAreaRoute ? "/admin/login" : "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    // 2. Rotas /admin — exigem role admin (exceto /admin/login)
    if (pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdmin = profile?.role === "admin";

      if (isAdminLoginRoute && isAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (!isAdminLoginRoute && !isAdmin) {
        return NextResponse.redirect(new URL("/painel/explorar", request.url));
      }
    }

    // 3. Onboarding multi-step não é mais obrigatório (princípio "facilitar
    //    comprador"): user logado vai direto pra /painel/explorar. Se acessar
    //    /onboarding manualmente, redireciona pra Explorar.
    if (pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/painel/explorar", request.url));
    }

    // 4. Já autenticado tentando entrar em /login ou /cadastro → /painel/explorar
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/painel/explorar", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api|sitemap.xml|robots.txt).*)",
  ],
};
