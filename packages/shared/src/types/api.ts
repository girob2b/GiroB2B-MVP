// ─── GiroB2B — API Contract Types ────────────────────────────────────────────
// Request and response shapes shared between apps/web and apps/api.

import type { PublicProfileLayoutItem } from "./database.js";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  role: string;
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface CompleteOnboardingRequest {
  segment: "buyer" | "supplier" | "both";
  trade_name?: string;
  cnpj?: string;
  phone?: string;
  segments_json?: string;
  purchase_frequency?: string;
  custom_category?: string;
}

export interface OnboardingResponse {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

// ── Supplier ──────────────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  description?: string | null;
  logo_url?: string | null;
  phone?: string;
  whatsapp?: string | null;
  address?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  founded_year?: number | null;
  employee_count?: string | null;
  operating_hours?: string | null;
  categories?: string[];
  photos?: string[];
  public_profile_layout?: PublicProfileLayoutItem[] | null;
}

export interface UpdateSettingsRequest {
  phone?: string;
  whatsapp?: string | null;
  address?: string | null;
  cep?: string | null;
  city?: string;
  state?: string;
  inscricao_municipal?: string | null;
  inscricao_estadual?: string | null;
  situacao_fiscal?: string | null;
  allow_relisting?: boolean;
}

export interface ImportProductRequest {
  original_product_id: string;
}

export interface ImportProductResponse {
  id: string;
}

export interface SupplierResponse {
  id: string;
  cnpj: string;
  company_name: string;
  trade_name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  cep: string | null;
  phone: string;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  founded_year: number | null;
  employee_count: string | null;
  profile_completeness: number;
  plan: string;
  is_verified: boolean;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  situacao_fiscal: string | null;
  operating_hours: string | null;
  categories: string[] | null;
  photos: string[] | null;
  public_profile_layout: PublicProfileLayoutItem[] | null;
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  unit?: string | null;
  min_order?: number | null;
  price_min_cents?: number | null;
  price_max_cents?: number | null;
  tags?: string[] | null;
  images?: string[] | null;
  status?: "active" | "paused";
}

export type UpdateProductRequest = Partial<CreateProductRequest>;

export interface ProductResponse {
  id: string;
  supplier_id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  unit: string | null;
  min_order: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  tags: string[] | null;
  images: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Inquiries ─────────────────────────────────────────────────────────────────

export interface CreateInquiryRequest {
  supplier_id: string;
  product_id?: string | null;
  description: string;
  quantity_estimate?: string | null;
  desired_deadline?: string | null;
  company_name?: string | null;
  cnpj?: string | null;
  lgpd_consent: true;
}

export interface InquiryResponse {
  id: string;
  inquiry_type: "directed" | "generic";
  supplier_id: string | null;
  product_id: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  description: string;
  quantity_estimate: string | null;
  desired_deadline: string | null;
  status: "new" | "viewed" | "responded" | "archived" | "reported";
  contact_unlocked: boolean;
  created_at: string;
}

export interface CreateInquiryResponse {
  success: true;
  deduplicated: boolean;
  supplier_name: string;
  inquiry: InquiryResponse;
}

// ── CNPJ ──────────────────────────────────────────────────────────────────────

export interface CNPJResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: number;
  descricao_situacao_cadastral: string;
  municipio: string;
  uf: string;
  natureza_juridica: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
}

// ── Generic ───────────────────────────────────────────────────────────────────

export interface SuccessResponse {
  success: true;
}

export interface ErrorResponse {
  error: string;
  statusCode?: number;
}
