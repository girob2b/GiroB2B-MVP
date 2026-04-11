// ─── GiroB2B — Database Types ────────────────────────────────────────────────
// Source of truth for all Supabase table shapes.
// Used by both apps/web (Supabase client) and apps/api (Fastify routes).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SupplierPlan = "free" | "starter" | "pro" | "premium";
export type UserRole = "user" | "buyer" | "supplier" | "admin";
export type UserSegment = "buyer" | "supplier" | "both";
export type ProductStatus = "active" | "paused" | "deleted";
export type InquiryStatus = "new" | "viewed" | "responded" | "archived" | "reported";
export type InquiryType = "directed" | "generic";
export type PublicProfileSectionKey = "hero" | "about" | "gallery" | "products" | "contact";
export type ConversationContextType = "inquiry" | "direct_purchase" | "direct";
export type ConversationStatus = "active" | "archived" | "blocked";
export type ChatMessageType = "text" | "inquiry_ref" | "product_ref" | "system";

export interface PublicProfileLayoutItem {
  key: PublicProfileSectionKey;
  enabled?: boolean;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          city: string | null;
          state: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
          created_at?: string;
        };
        Update: {
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
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
          operating_hours: string | null;
          categories: string[] | null;
          photos: string[] | null;
          profile_completeness: number;
          plan: SupplierPlan;
          plan_expires_at: string | null;
          is_verified: boolean;
          cnpj_status: string | null;
          inscricao_municipal: string | null;
          inscricao_estadual: string | null;
          situacao_fiscal: string | null;
          public_profile_layout: PublicProfileLayoutItem[] | null;
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
          city?: string | null;
          state?: string | null;
          address?: string | null;
          cep?: string | null;
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
          inscricao_municipal?: string | null;
          inscricao_estadual?: string | null;
          situacao_fiscal?: string | null;
          public_profile_layout?: PublicProfileLayoutItem[] | null;
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
          name: string | null;
          email: string;
          phone: string | null;
          company: string | null;
          company_name: string | null;
          cnpj: string | null;
          city: string | null;
          state: string | null;
          segments: string[] | null;
          purchase_frequency: string | null;
          lgpd_consent: boolean;
          lgpd_consent_at: string | null;
          blocked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          email: string;
          phone?: string | null;
          company?: string | null;
          company_name?: string | null;
          cnpj?: string | null;
          city?: string | null;
          state?: string | null;
          segments?: string[] | null;
          purchase_frequency?: string | null;
          lgpd_consent: boolean;
          lgpd_consent_at?: string | null;
          blocked_until?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["buyers"]["Insert"]>;
      };
      inquiries: {
        Row: {
          id: string;
          supplier_id: string | null;
          product_id: string | null;
          buyer_id: string | null;
          category_id: string | null;
          inquiry_type: InquiryType;
          buyer_name: string | null;
          buyer_email: string | null;
          buyer_phone: string | null;
          buyer_company: string | null;
          buyer_city: string | null;
          buyer_state: string | null;
          buyer_consent_to_share: boolean;
          description: string;
          quantity_estimate: string | null;
          desired_deadline: string | null;
          max_proposals: number | null;
          status: InquiryStatus;
          viewed_at: string | null;
          responded_at: string | null;
          archived_at: string | null;
          replied_at: string | null;
          contact_unlocked: boolean;
          unlocked_at: string | null;
          unlocked_by_credit: boolean;
          credits_used: number;
          report_count: number;
          dedup_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id?: string | null;
          product_id?: string | null;
          buyer_id?: string | null;
          category_id?: string | null;
          inquiry_type?: InquiryType;
          buyer_name?: string | null;
          buyer_email?: string | null;
          buyer_phone?: string | null;
          buyer_company?: string | null;
          buyer_city?: string | null;
          buyer_state?: string | null;
          buyer_consent_to_share?: boolean;
          description: string;
          quantity_estimate?: string | null;
          desired_deadline?: string | null;
          max_proposals?: number | null;
          status?: InquiryStatus;
          viewed_at?: string | null;
          responded_at?: string | null;
          archived_at?: string | null;
          replied_at?: string | null;
          contact_unlocked?: boolean;
          unlocked_at?: string | null;
          unlocked_by_credit?: boolean;
          credits_used?: number;
          report_count?: number;
          dedup_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["inquiries"]["Insert"]>;
      };
      inquiry_rate_limits: {
        Row: {
          buyer_email: string;
          date: string;
          count: number;
        };
        Insert: {
          buyer_email: string;
          date?: string;
          count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["inquiry_rate_limits"]["Insert"]>;
      };
      email_notifications: {
        Row: {
          id: string;
          type: string;
          recipient: string;
          subject: string;
          sent_at: string;
          status: "sent" | "failed" | "bounced";
        };
        Insert: {
          id?: string;
          type: string;
          recipient: string;
          subject: string;
          sent_at?: string;
          status?: "sent" | "failed" | "bounced";
        };
        Update: Partial<Database["public"]["Tables"]["email_notifications"]["Insert"]>;
      };
      search_suggestions: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          context: string | null;
          status: "new" | "reviewed" | "implemented" | "dismissed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          context?: string | null;
          status?: "new" | "reviewed" | "implemented" | "dismissed";
        };
        Update: Partial<Database["public"]["Tables"]["search_suggestions"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          buyer_id: string;
          supplier_id: string;
          inquiry_id: string | null;
          context_type: ConversationContextType;
          product_id: string | null;
          product_name: string | null;
          status: ConversationStatus;
          last_message_at: string | null;
          last_message_preview: string | null;
          buyer_unread: number;
          supplier_unread: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          supplier_id: string;
          inquiry_id?: string | null;
          context_type?: ConversationContextType;
          product_id?: string | null;
          product_name?: string | null;
          status?: ConversationStatus;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          buyer_unread?: number;
          supplier_unread?: number;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: ChatMessageType;
          metadata: Record<string, unknown> | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: ChatMessageType;
          metadata?: Record<string, unknown> | null;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
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
          supplier_city: string | null;
          supplier_state: string | null;
          is_verified: boolean;
          supplier_plan: SupplierPlan;
          supplier_logo: string | null;
          profile_completeness: number;
          category_name: string | null;
          category_slug: string | null;
        };
      };
    };
    Functions: Record<string, never>;
  };
}
