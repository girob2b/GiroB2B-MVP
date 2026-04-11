"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import ImportModal from "./import-modal";

export default function ImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="rounded-xl h-10 px-5 gap-2 border-slate-200 hover:border-[color:var(--brand-green-400)] hover:text-[color:var(--brand-green-700)]"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Importar Planilha
      </Button>
      <ImportModal open={open} onOpenChange={setOpen} />
    </>
  );
}
