import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas que exigem autenticação */
const PROTECTED_ROUTES = ["/painel", "/comprador", "/admin", "/onboarding"];
/** Rotas que redirecionam para o painel se já estiver logado E com onboarding completo */
const AUTH_ROUTES = ["/login", "/registro", "/cadastro"];

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

  // 1. Não autenticado tentando acessar área protegida
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const onboardingComplete = user.user_metadata?.onboarding_complete === true;
    const isOnboarding = pathname.startsWith("/onboarding");

    // 2. Rota /admin — exige role admin
    if (pathname.startsWith("/admin") && !isOnboarding) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/painel", request.url));
      }
    }

    // 3. Onboarding incompleto → forçar /onboarding
    if (!onboardingComplete && isProtected && !isOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // 4. Onboarding completo → sair do /onboarding
    if (onboardingComplete && isOnboarding) {
      return NextResponse.redirect(new URL("/painel", request.url));
    }

    // 5. Já autenticado + onboarding completo → sair de login/cadastro
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
    if (isAuthRoute && onboardingComplete) {
      return NextResponse.redirect(new URL("/painel", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api|sitemap.xml|robots.txt).*)",
  ],
};
