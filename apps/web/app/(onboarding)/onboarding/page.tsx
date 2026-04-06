import type { Metadata } from "next";
import OnboardingForm from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete seu perfil — GiroB2B",
  description: "Diga como você vai usar a plataforma para personalizarmos sua experiência.",
};

export default function OnboardingPage() {
  return <OnboardingForm />;
}
