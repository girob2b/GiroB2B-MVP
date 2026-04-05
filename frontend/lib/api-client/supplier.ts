import { apiClient } from "./index";
import type { SupplierResponse, UpdateProfileRequest, UpdateSettingsRequest, SuccessResponse } from "@/types/api";

export async function getMySupplier(token: string): Promise<SupplierResponse> {
  return apiClient(token).get<SupplierResponse>("/supplier/me");
}

export async function updateProfile(token: string, data: UpdateProfileRequest): Promise<SuccessResponse & { completeness: number }> {
  return apiClient(token).patch("/supplier/me", data);
}

export async function updateSettings(token: string, data: UpdateSettingsRequest): Promise<SuccessResponse> {
  return apiClient(token).patch("/supplier/settings", data);
}
