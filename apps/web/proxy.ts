import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSuspendedAccountStatus } from "@/lib/auth/account-status";

/** Rotas que exigem autenticacao */
const PROTECTED_ROUTES = ["/painel", "/comprador", "/admin", "/onboarding"];
/** Rotas que redirecionam para o painel se ja estiver logado */
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
  const isSuspendedRoute = pathname === "/suspended";
  const isAdminLoginRoute = pathname === "/admin/login";
  const isAdminAreaRoute = pathname.startsWith("/admin") && !isAdminLoginRoute;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtected =
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) && !isAdminLoginRoute;

  // 1) Nao autenticado tentando acessar area protegida.
  if (isProtected && !user) {
    if (isAdminAreaRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      return NextResponse.redirect(redirectUrl);
    }
    // Para rotas de usuario, abre o modal de login sobre a pagina de explorar
    // em vez de redirecionar para a pagina /login isolada.
    const url = new URL("/explorar", request.url);
    url.searchParams.set("auth", "login");
    return NextResponse.redirect(url);
  }

  if (user) {
    let isAdmin = false;

    // 2) Conta suspensa nao acessa rotas protegidas nem rotas de autenticacao.
    if (isProtected || isAuthRoute || isSuspendedRoute || pathname.startsWith("/admin")) {
      const [{ data: profile }, { data: profileStatus }, { data: supplier }] = await Promise.all([
        supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("user_profiles").select("status").eq("id", user.id).maybeSingle(),
        supabase.from("suppliers").select("suspended").eq("user_id", user.id).maybeSingle(),
      ]);

      isAdmin = profile?.role === "admin";

      const isSuspended = isSuspendedAccountStatus(profileStatus?.status, Boolean(supplier?.suspended));
      if (isSuspended && !isSuspendedRoute) {
        return NextResponse.redirect(new URL("/suspended", request.url));
      }

      if (!isSuspended && isSuspendedRoute) {
        return NextResponse.redirect(new URL("/painel/explorar", request.url));
      }
    } else if (pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }

    // 3) Rotas /admin exigem role admin (exceto /admin/login).
    if (pathname.startsWith("/admin")) {
      if (isAdminLoginRoute && isAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (!isAdminLoginRoute && !isAdmin) {
        return NextResponse.redirect(new URL("/painel/explorar", request.url));
      }
    }

    // 4) Onboarding multi-step nao eh mais obrigatorio.
    if (pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/painel/explorar", request.url));
    }

    // 5) Ja autenticado tentando entrar em /login ou /cadastro.
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/painel/explorar", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|api|sitemap.xml|robots.txt).*)"],
};
