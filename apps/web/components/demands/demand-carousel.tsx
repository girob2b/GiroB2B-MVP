import type { ReactNode } from "react";
import { Carousel } from "@/components/ui/carousel";

/**
 * Carrossel de demandas — alias fino do {@link Carousel} genérico com a
 * identidade de demanda fixada (accent gold, itemNoun "Demanda"). Mantido por
 * compatibilidade com os imports existentes; a lógica vive em `ui/carousel`.
 */
export function DemandCarousel({
  children,
  ariaLabel = "Demandas abertas",
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Carousel ariaLabel={ariaLabel} itemNoun="Demanda" accent="gold">
      {children}
    </Carousel>
  );
}
