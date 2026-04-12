import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResoldBadgeProps {
  className?: string;
}

/**
 * Selo discreto "Revenda" exibido em cards e páginas de produtos que foram
 * importados do catálogo de outro fornecedor (feature de relistagem).
 * Sem link, sem nome do fornecedor original — por design.
 */
export function ResoldBadge({ className }: ResoldBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700",
        className
      )}
      title="Este produto é oferecido por um revendedor"
    >
      <Repeat className="w-2.5 h-2.5" />
      Revenda
    </span>
  );
}
