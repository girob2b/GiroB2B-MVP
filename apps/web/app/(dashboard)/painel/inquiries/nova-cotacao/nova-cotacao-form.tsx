"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createNewQuote } from "@/app/actions/inquiries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_TYPES = [
  { value: "fabricante", label: "Fabricante", description: "Produto direto de quem produz" },
  { value: "importador", label: "Importador", description: "Produto importado ou representante" },
  { value: "atacado", label: "Atacado", description: "Distribuidor ou atacadista" },
] as const;

export default function NovaCotacaoForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createNewQuote, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success("Cotacao criada com sucesso.");
      router.push("/painel/inquiries?tab=sent");
    }
  }, [router, state.error, state.success]);

  return (
    <form action={action} className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Produto ou material</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="product_name" className="text-sm font-semibold">
              Nome do produto ou material <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product_name"
              name="product_name"
              required
              placeholder="Ex: Filme stretch, parafuso M8, tecido oxford..."
              className="h-11 border-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-semibold">
                Quantidade estimada
              </Label>
              <Input id="quantity" name="quantity" placeholder="Ex: 500 unidades" className="h-11 border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_price" className="text-sm font-semibold">
                Preço alvo
              </Label>
              <Input id="target_price" name="target_price" placeholder="Ex: Ate R$ 2.000" className="h-11 border-slate-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Localizacao e categoria</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-semibold">Categoria</Label>
            <Input id="category" name="category" placeholder="Ex: Embalagens" className="h-10 border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state" className="text-sm font-semibold">Estado</Label>
            <Input id="state" name="state" placeholder="Ex: SP" className="h-10 border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-semibold">Cidade</Label>
            <Input id="city" name="city" placeholder="Ex: Sao Paulo" className="h-10 border-slate-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Tipo de fornecedor desejado</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="radio" name="contact_type" value="" defaultChecked className="mt-0.5 accent-[color:var(--brand-primary-600)]" />
              <div>
                <p className="text-sm font-medium text-slate-800">Qualquer um</p>
                <p className="text-xs text-slate-500">Sem preferencia</p>
              </div>
            </label>
            {CONTACT_TYPES.map(({ value, label, description }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer group">
                <input type="radio" name="contact_type" value={value} className="mt-0.5 accent-[color:var(--brand-primary-600)]" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Detalhes adicionais</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <Textarea
            id="notes"
            name="notes"
            placeholder="Descreva detalhes adicionais da cotacao."
            rows={4}
            className="border-slate-200"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          render={<Link href="/painel/inquiries?tab=sent" />}
          className="gap-2 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="btn-primary h-11 px-8 rounded-xl font-bold gap-2 min-w-44"
        >
          {pending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="w-4 h-4" /> Criar nova cotacao</>
          )}
        </Button>
      </div>
    </form>
  );
}
