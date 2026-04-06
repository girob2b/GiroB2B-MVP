import { apiClient } from "./index";
import type { CompleteOnboardingRequest, OnboardingResponse } from "@girob2b/shared";

export async function completeOnboarding(token: string, data: CompleteOnboardingRequest): Promise<OnboardingResponse> {
  return apiClient(token).post<OnboardingResponse>("/onboarding/complete", data);
}
