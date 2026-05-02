"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import NeedForm from "@/components/needs/need-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NovaInquiryForm() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-base font-bold">Detalhes da necessidade</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <NeedForm
            submitLabel="Publicar necessidade"
            submittingLabel="Publicando..."
            showCancel
            onCancel={() => router.push("/painel/inquiries?tab=needs")}
            onSuccess={() => {
              toast.success("Necessidade publicada com status pendente.");
              router.push("/painel/inquiries?tab=needs");
            }}
          />
        </CardContent>
      </Card>

      <div>
        <Button
          type="button"
          variant="ghost"
          render={<Link href="/painel/inquiries?tab=needs" />}
          className="gap-2 text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Necessidades
        </Button>
      </div>
    </div>
  );
}
