export const bearerAuth = [{ bearerAuth: [] }];

export const authUserSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    role: { type: "string", enum: ["user", "buyer", "supplier", "admin"] },
    email_confirmed_at: { type: ["string", "null"], format: "date-time" },
  },
  required: ["id", "email", "role"],
};

export const authSessionSchema = {
  type: ["object", "null"],
  properties: {
    access_token: { type: "string" },
    refresh_token: { type: "string" },
    expires_at: { type: ["number", "null"] },
    expires_in: { type: "number" },
    token_type: { type: "string" },
  },
};

export const authLoginBodySchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
  },
  required: ["email", "password"],
};

export const authRegisterBodySchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
    full_name: { type: "string" },
    phone: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    role: { type: "string", enum: ["user", "buyer", "supplier"] },
    redirect_to: { type: "string", format: "uri" },
  },
  required: ["email", "password"],
};

export const verifyEmailBodySchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
    token: { type: "string", minLength: 6, maxLength: 6 },
  },
  required: ["email", "token"],
};

export const authPasswordResetBodySchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
    redirect_to: { type: "string", format: "uri" },
  },
  required: ["email"],
};

export const authUpdatePasswordBodySchema = {
  type: "object",
  properties: {
    password: { type: "string", minLength: 8 },
  },
  required: ["password"],
};

export const authResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    user: {
      oneOf: [authUserSchema, { type: "null" }],
    },
    needs_email_verification: { type: "boolean" },
    session: authSessionSchema,
  },
  required: ["success"],
};

// Apenas documentação para o Swagger — a validação real é feita pelo preHandler authenticate
export const authHeaderSchema = {
  type: "object",
  properties: {
    authorization: {
      type: "string",
      description: "Bearer token no formato: Bearer <jwt>",
    },
  },
};

export const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
  required: ["error"],
};

export const validationErrorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    errors: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
};

export const successSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
  },
  required: ["success"],
};

export const healthSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
  },
  required: ["status", "timestamp"],
};

export const cnpjResponseSchema = {
  type: "object",
  properties: {
    cnpj: { type: "string" },
    razao_social: { type: "string" },
    nome_fantasia: { type: "string" },
    situacao_cadastral: { type: "number" },
    descricao_situacao_cadastral: { type: "string" },
    municipio: { type: "string" },
    uf: { type: "string" },
    natureza_juridica: { type: "string" },
    descricao_natureza_juridica: { type: "string" },
    data_inicio_atividade: { type: "string" },
    cep: { type: "string" },
    logradouro: { type: "string" },
    numero: { type: "string" },
    bairro: { type: "string" },
  },
  required: [
    "cnpj",
    "razao_social",
    "nome_fantasia",
    "situacao_cadastral",
    "descricao_situacao_cadastral",
    "municipio",
    "uf",
    "natureza_juridica",
    "descricao_natureza_juridica",
    "data_inicio_atividade",
    "cep",
    "logradouro",
    "numero",
    "bairro",
  ],
};

export const onboardingBodySchema = {
  type: "object",
  properties: {
    segment: { type: "string", enum: ["buyer", "supplier", "both"] },
    trade_name: { type: "string" },
    cnpj: { type: "string" },
    phone: { type: "string" },
    segments_json: { type: "string" },
    purchase_frequency: { type: "string" },
    custom_category: { type: "string" },
  },
  required: ["segment"],
};

export const onboardingResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    errors: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
};

export const publicProfileLayoutSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    properties: {
      key: {
        type: "string",
        enum: ["hero", "about", "gallery", "products", "contact"],
      },
      enabled: { type: "boolean" },
    },
    required: ["key"],
  },
};

export const supplierResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    cnpj: { type: "string" },
    company_name: { type: "string" },
    trade_name: { type: "string" },
    slug: { type: "string" },
    description: { type: ["string", "null"] },
    logo_url: { type: ["string", "null"] },
    city: { type: "string" },
    state: { type: "string" },
    address: { type: ["string", "null"] },
    cep: { type: ["string", "null"] },
    phone: { type: "string" },
    whatsapp: { type: ["string", "null"] },
    website: { type: ["string", "null"] },
    instagram: { type: ["string", "null"] },
    linkedin: { type: ["string", "null"] },
    founded_year: { type: ["number", "null"] },
    employee_count: {
      type: ["string", "null"],
      enum: ["1-5", "6-10", "11-50", "51-200", "201-500", "500+", null],
    },
    operating_hours: { type: ["string", "null"] },
    categories: {
      type: ["array", "null"],
      items: { type: "string", format: "uuid" },
    },
    photos: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    profile_completeness: { type: "number" },
    plan: { type: "string", enum: ["free", "starter", "pro", "premium"] },
    is_verified: { type: "boolean" },
    inscricao_municipal: { type: ["string", "null"] },
    inscricao_estadual: { type: ["string", "null"] },
    situacao_fiscal: {
      type: ["string", "null"],
      enum: [
        "simples_nacional",
        "mei",
        "lucro_presumido",
        "lucro_real",
        "lucro_arbitrado",
        "imune",
        "isento",
        "outros",
        null,
      ],
    },
    public_profile_layout: publicProfileLayoutSchema,
  },
  required: [
    "id",
    "cnpj",
    "company_name",
    "trade_name",
    "slug",
    "city",
    "state",
    "phone",
    "profile_completeness",
    "plan",
    "is_verified",
  ],
};

export const updateProfileBodySchema = {
  type: "object",
  properties: {
    description: { type: ["string", "null"] },
    logo_url: { type: ["string", "null"], format: "uri" },
    phone: { type: "string" },
    whatsapp: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    website: { type: ["string", "null"], format: "uri" },
    instagram: { type: ["string", "null"] },
    linkedin: { type: ["string", "null"] },
    founded_year: { type: ["integer", "null"], minimum: 1800 },
    employee_count: {
      type: ["string", "null"],
      enum: ["1-5", "6-10", "11-50", "51-200", "201-500", "500+", null],
    },
    operating_hours: { type: ["string", "null"] },
    categories: {
      type: "array",
      items: { type: "string", format: "uuid" },
    },
    photos: {
      type: "array",
      items: { type: "string" },
    },
    public_profile_layout: publicProfileLayoutSchema,
  },
};

export const updateSettingsBodySchema = {
  type: "object",
  properties: {
    phone: { type: "string" },
    whatsapp: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    cep: { type: ["string", "null"] },
    city: { type: "string" },
    state: { type: "string", minLength: 2, maxLength: 2 },
    inscricao_municipal: { type: ["string", "null"] },
    inscricao_estadual: { type: ["string", "null"] },
    situacao_fiscal: {
      type: ["string", "null"],
      enum: [
        "simples_nacional",
        "mei",
        "lucro_presumido",
        "lucro_real",
        "lucro_arbitrado",
        "imune",
        "isento",
        "outros",
        null,
      ],
    },
  },
};

export const productBodySchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 2 },
    description: { type: ["string", "null"] },
    category_id: { type: ["string", "null"], format: "uuid" },
    unit: { type: ["string", "null"] },
    min_order: { type: ["integer", "null"], minimum: 1 },
    price_min_cents: { type: ["integer", "null"], minimum: 0 },
    price_max_cents: { type: ["integer", "null"], minimum: 0 },
    tags: { type: ["array", "null"], items: { type: "string" } },
    images: { type: ["array", "null"], items: { type: "string" } },
    status: { type: "string", enum: ["active", "paused"] },
  },
  required: ["name"],
};

export const updateProductBodySchema = {
  type: "object",
  properties: productBodySchema.properties,
};

export const productResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    supplier_id: { type: "string", format: "uuid" },
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: ["string", "null"] },
    category_id: { type: ["string", "null"], format: "uuid" },
    unit: { type: ["string", "null"] },
    min_order: { type: ["integer", "null"] },
    price_min_cents: { type: ["integer", "null"] },
    price_max_cents: { type: ["integer", "null"] },
    tags: { type: ["array", "null"], items: { type: "string" } },
    images: { type: ["array", "null"], items: { type: "string" } },
    status: { type: "string", enum: ["active", "paused", "deleted"] },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "supplier_id",
    "name",
    "slug",
    "status",
    "created_at",
    "updated_at",
  ],
};

export const inquiryResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    supplier_id: { type: ["string", "null"], format: "uuid" },
    product_id: { type: ["string", "null"], format: "uuid" },
    buyer_id: { type: ["string", "null"], format: "uuid" },
    inquiry_type: { type: "string", enum: ["directed", "generic"] },
    description: { type: "string" },
    quantity_estimate: { type: ["string", "null"] },
    desired_deadline: { type: ["string", "null"] },
    status: {
      type: "string",
      enum: ["new", "viewed", "responded", "archived", "reported"],
    },
    buyer_name: { type: ["string", "null"] },
    buyer_email: { type: ["string", "null"] },
    buyer_phone: { type: ["string", "null"] },
    buyer_company: { type: ["string", "null"] },
    buyer_city: { type: ["string", "null"] },
    buyer_state: { type: ["string", "null"] },
    contact_unlocked: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
    suppliers: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          trade_name: { type: "string" },
          slug: { type: "string" },
          plan: { type: "string", enum: ["free", "starter", "pro", "premium"] },
        },
        required: ["id", "trade_name", "slug", "plan"],
      },
    },
  },
  required: [
    "id",
    "supplier_id",
    "product_id",
    "buyer_id",
    "inquiry_type",
    "description",
    "status",
    "contact_unlocked",
    "created_at",
  ],
};

export const createInquiryBodySchema = {
  type: "object",
  properties: {
    supplier_id: { type: "string", format: "uuid" },
    product_id: { type: ["string", "null"], format: "uuid" },
    description: { type: "string", minLength: 20, maxLength: 5000 },
    quantity_estimate: { type: ["string", "null"] },
    desired_deadline: { type: ["string", "null"] },
    company_name: { type: ["string", "null"] },
    cnpj: { type: ["string", "null"] },
    lgpd_consent: { type: "boolean", const: true },
  },
  required: ["supplier_id", "description", "lgpd_consent"],
};

export const createInquiryResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    deduplicated: { type: "boolean" },
    supplier_name: { type: "string" },
    inquiry: inquiryResponseSchema,
  },
  required: ["success", "deduplicated", "supplier_name", "inquiry"],
};

export const suggestionBodySchema = {
  type: "object",
  properties: {
    query: { type: "string", minLength: 2 },
    category_slug: { type: "string" },
  },
  required: ["query"],
};

export const supplierUpdateResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    completeness: { type: "number" },
  },
  required: ["success"],
};
