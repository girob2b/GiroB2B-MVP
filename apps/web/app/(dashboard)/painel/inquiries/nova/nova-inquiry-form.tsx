"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { createGenericInquiry } from "@/app/actions/inquiries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CONTACT_TYPES = [
  { value: "fabricante",  label: "Fabricante",  description: "Produto direto de quem produz" },
  { value: "importador",  label: "Importador",  description: "Produto importado ou representante" },
  { value: "atacado",     label: "Atacado",     description: "Distribuidor ou atacadista" },
] as const;

export default function NovaInquiryForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createGenericInquiry, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success("Cotação publicada! Fornecedores já podem ver sua necessidade.");
      router.push("/painel/inquiries?tab=general");
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Produto ou material</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="product_name" className="text-sm font-semibold">
              Nome do produto / material <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product_name"
              name="product_name"
              placeholder="Ex: Embalagem plástica transparente 1L, Parafuso M8, Tecido oxford..."
              className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-primary-500)] focus-visible:ring-[color:var(--brand-primary-100)]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-semibold">
                Quantidade necessária <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                placeholder="Ex: 500 unidades, 50 kg, 10 caixas..."
                className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-primary-500)] focus-visible:ring-[color:var(--brand-primary-100)]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_price" className="text-sm font-semibold">
                Preço-alvo <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="target_price"
                name="target_price"
                placeholder="Ex: R$ 5,00 / unidade, até R$ 2.000..."
                className="h-11 border-slate-200 focus-visible:border-[color:var(--brand-primary-500)] focus-visible:ring-[color:var(--brand-primary-100)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Tipo de fornecedor preferido</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="contact_type"
                value=""
                defaultChecked
                className="mt-0.5 accent-[color:var(--brand-primary-600)]"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Qualquer um</p>
                <p className="text-xs text-slate-500">Sem preferência</p>
              </div>
            </label>
            {CONTACT_TYPES.map(({ value, label, description }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="contact_type"
                  value={value}
                  className="mt-0.5 accent-[color:var(--brand-primary-600)]"
                />
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
          <CardTitle className="text-base font-bold">Detalhes adicionais <span className="text-xs font-normal text-muted-foreground">(opcional)</span></CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <Textarea
            id="notes"
            name="notes"
            placeholder="Especificações técnicas, prazo desejado, condições de entrega, qualquer detalhe que ajude os fornecedores a entender melhor sua necessidade..."
            rows={4}
            className="border-slate-200 focus-visible:border-[color:var(--brand-primary-500)] focus-visible:ring-[color:var(--brand-primary-100)]"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          render={<Link href="/painel/inquiries?tab=general" />}
          className="gap-2 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="btn-primary h-11 px-8 rounded-xl font-bold gap-2 min-w-40"
        >
          {pending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
          ) : (
            <><Send className="w-4 h-4" /> Publicar cotação</>
          )}
        </Button>
      </div>
    </form>
  );
}
