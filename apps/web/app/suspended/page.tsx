import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Conta suspensa" };

export default function SuspendedPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">Conta suspensa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm leading-6 text-slate-600">
            Sua conta foi suspensa por violar as politicas de uso do nosso sistema.
            <br />
            Se acha que isso é um erro, entre em contato com o nosso suporte.
          </p>

          <div className="flex flex-wrap gap-3">
            <form action={logout}>
              <Button type="submit" variant="outline">
                Sair da conta
              </Button>
            </form>
            <Button
              render={
                <Link href="mailto:girob2boficial@gmail.com">
                  Falar com suporte
                </Link>
              }
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
