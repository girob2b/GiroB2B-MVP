"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getTutorialSteps, type TutorialRole } from "./tutorial-steps";
import { markTutorialCompleted } from "@/app/actions/tutorial";

interface TutorialRunnerProps {
  role: TutorialRole;
}

/**
 * Tutorial primeiro-login. Renderizado pelo DashboardShell apenas quando
 * o user_metadata.tutorial_completed_at é null (detectado no server layout).
 *
 * Princípios (decisão Vitor 2026-05-24):
 *   - Sempre tem botão "Pular" (close icon no popover do driver.js)
 *   - Skip e completo gravam o mesmo timestamp — não pergunta de novo
 *   - Overlay com leve blur, foco no elemento-âncora, animação suave
 *   - Linguagem de psicologia positiva (acolhe, não cobra)
 *
 * Dispara após 600ms do mount pra dar tempo do layout pintar e os data-tutorial
 * attrs ficarem disponíveis. Sem timeout dá flicker em conexões lentas.
 */
export default function TutorialRunner({ role }: TutorialRunnerProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const steps = getTutorialSteps(role);
      const driverObj = driver({
        showProgress: true,
        progressText: "Passo {{current}} de {{total}}",
        nextBtnText: "Próximo →",
        prevBtnText: "← Voltar",
        doneBtnText: "Bora começar!",
        smoothScroll: true,
        animate: true,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 12,
        popoverClass: "girob2b-tutorial",
        steps,
        // Skip e completo passam pelo mesmo cleanup — grava timestamp único.
        onDestroyed: () => {
          void markTutorialCompleted();
        },
      });

      // Só dispara se o primeiro elemento-âncora existir — senão, layout
      // ainda não pintou OU a rota não é o /painel esperado (defensivo).
      const firstSelector = (steps[0]?.element ?? "") as string;
      const firstExists = !firstSelector || document.querySelector(firstSelector);
      if (!firstExists) {
        // Marca como completo mesmo assim — evita loop de "vou tentar de novo
        // no próximo refresh" se o user navegar pra rota sem o elemento.
        void markTutorialCompleted();
        return;
      }

      driverObj.drive();
    }, 600);

    return () => clearTimeout(timer);
  }, [role]);

  return null;
}
