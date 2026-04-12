import { createClient } from "@/lib/supabase/server";
import { PublicNavbar } from "@/components/layout/public-navbar";

export default async function ExplorarLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user?.user_metadata?.onboarding_complete);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar isLoggedIn={isLoggedIn} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
