// ─── Shared API contract types between frontend and backend ──────────────────
// Request and response shapes for all endpoints.

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  role: string;
}

// ── Onboarding ───────────────────────────────────────────────────────────────

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

// ── Supplier ─────────────────────────────────────────────────────────────────

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
}

export interface SupplierResponse {
  id: string;
  cnpj: string;
  company_name: string;
  trade_name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  city: string;
  state: string;
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
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  category_id?: string | null;
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

// ── CNPJ ─────────────────────────────────────────────────────────────────────

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
