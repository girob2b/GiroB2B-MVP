import { apiClient } from "./index";
import type { ProductResponse, CreateProductRequest, UpdateProductRequest } from "@/types/api";

export async function getProducts(token: string): Promise<ProductResponse[]> {
  return apiClient(token).get<ProductResponse[]>("/products");
}

export async function createProduct(token: string, data: CreateProductRequest): Promise<ProductResponse> {
  return apiClient(token).post<ProductResponse>("/products", data);
}

export async function updateProduct(token: string, id: string, data: UpdateProductRequest): Promise<ProductResponse> {
  return apiClient(token).patch<ProductResponse>(`/products/${id}`, data);
}

export async function deleteProduct(token: string, id: string): Promise<void> {
  return apiClient(token).delete<void>(`/products/${id}`);
}
