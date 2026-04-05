export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SupplierPlan = "free" | "starter" | "pro" | "premium";
export type UserRole = "buyer" | "supplier" | "admin";
export type ProductStatus = "active" | "paused" | "deleted";
export type InquiryStatus = "new" | "viewed" | "replied" | "archived" | "spam";

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          role?: UserRole;
        };
      };
      suppliers: {
        Row: {
          id: string;
          user_id: string;
          cnpj: string;
          company_name: string;
          trade_name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          city: string;
          state: string;
          address: string | null;
          phone: string;
          whatsapp: string | null;
          website: string | null;
          instagram: string | null;
          linkedin: string | null;
          founded_year: number | null;
          employee_count: string | null;
          operating_hours: string | null;
          categories: string[] | null;
          photos: string[] | null;
          profile_completeness: number;
          plan: SupplierPlan;
          plan_expires_at: string | null;
          is_verified: boolean;
          cnpj_status: string | null;
          suspended: boolean;
          suspension_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cnpj: string;
          company_name: string;
          trade_name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          city: string;
          state: string;
          address?: string | null;
          phone: string;
          whatsapp?: string | null;
          website?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          founded_year?: number | null;
          employee_count?: string | null;
          operating_hours?: string | null;
          categories?: string[] | null;
          photos?: string[] | null;
          profile_completeness?: number;
          plan?: SupplierPlan;
          plan_expires_at?: string | null;
          is_verified?: boolean;
          cnpj_status?: string | null;
          suspended?: boolean;
          suspension_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          supplier_id: string;
          name: string;
          slug: string;
          description: string | null;
          category_id: string | null;
          subcategory_id: string | null;
          images: string[] | null;
          unit: string | null;
          min_order: number | null;
          price_min_cents: number | null;
          price_max_cents: number | null;
          tags: string[] | null;
          status: ProductStatus;
          deleted_at: string | null;
          views_count: number;
          inquiry_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          name: string;
          slug: string;
          description?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          images?: string[] | null;
          unit?: string | null;
          min_order?: number | null;
          price_min_cents?: number | null;
          price_max_cents?: number | null;
          tags?: string[] | null;
          status?: ProductStatus;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          description: string | null;
          icon: string | null;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          description?: string | null;
          icon?: string | null;
          active?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      buyers: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          city: string | null;
          state: string | null;
          lgpd_consent: boolean;
          lgpd_consent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          city?: string | null;
          state?: string | null;
          lgpd_consent: boolean;
          lgpd_consent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["buyers"]["Insert"]>;
      };
      inquiries: {
        Row: {
          id: string;
          supplier_id: string;
          product_id: string | null;
          buyer_id: string | null;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string | null;
          buyer_company: string | null;
          buyer_city: string | null;
          description: string;
          quantity: string | null;
          deadline: string | null;
          status: InquiryStatus;
          viewed_at: string | null;
          replied_at: string | null;
          contact_unlocked: boolean;
          credits_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          product_id?: string | null;
          buyer_id?: string | null;
          buyer_name: string;
          buyer_email: string;
          buyer_phone?: string | null;
          buyer_company?: string | null;
          buyer_city?: string | null;
          description: string;
          quantity?: string | null;
          deadline?: string | null;
          status?: InquiryStatus;
          contact_unlocked?: boolean;
          credits_used?: number;
        };
        Update: Partial<Database["public"]["Tables"]["inquiries"]["Insert"]>;
      };
    };
    Views: {
      product_listings: {
        Row: {
          id: string;
          supplier_id: string;
          name: string;
          slug: string;
          description: string | null;
          category_id: string | null;
          images: string[] | null;
          unit: string | null;
          min_order: number | null;
          price_min_cents: number | null;
          price_max_cents: number | null;
          tags: string[] | null;
          views_count: number;
          inquiry_count: number;
          created_at: string;
          supplier_name: string;
          supplier_slug: string;
          supplier_city: string;
          supplier_state: string;
          is_verified: boolean;
          supplier_plan: SupplierPlan;
          supplier_logo: string | null;
          profile_completeness: number;
          category_name: string | null;
          category_slug: string | null;
        };
      };
    };
    Functions: {};
  };
}
