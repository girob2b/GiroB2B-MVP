import { createAdminClient, createClient } from "../lib/supabase.js";
import type {
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResendSignupInput,
  UpdatePasswordInput,
  VerifyEmailInput,
} from "../schemas/auth.schema.js";

class AuthServiceError extends Error {
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(message: string, statusCode = 400, details?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getBaseUrl() {
  return (
    process.env.AUTH_REDIRECT_BASE_URL ??
    process.env.ALLOWED_ORIGIN ??
    "http://localhost:3000"
  );
}

function getSignupRedirectUrl(override?: string) {
  if (override) return override;
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/callback?next=${encodeURIComponent("/login?status=email_confirmado")}`;
}

function getPasswordResetRedirectUrl(override?: string) {
  if (override) return override;
  const baseUrl = getBaseUrl();
  return `${baseUrl}/redefinir-senha`;
}

export async function login(input: LoginInput) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user || !data.session) {
    if (error?.message.includes("Invalid login credentials")) {
      throw new AuthServiceError("Email ou senha incorretos.", 401);
    }

    if (error?.message.includes("Email not confirmed")) {
      throw new AuthServiceError("Confirme seu email antes de entrar.", 403);
    }

    throw new AuthServiceError("Nao foi possivel autenticar o usuario.", 500);
  }

  return {
    success: true as const,
    user: {
      id: data.user.id,
      email: data.user.email ?? input.email,
      role: String(data.user.user_metadata?.role ?? "user"),
      email_confirmed_at: data.user.email_confirmed_at ?? null,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    },
  };
}

export async function register(input: RegisterInput) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: getSignupRedirectUrl(input.redirect_to),
      data: {
        full_name: input.full_name,
        phone: input.phone,
        city: input.city,
        state: input.state,
        role: input.role ?? "user",
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      throw new AuthServiceError("Este email ja esta cadastrado.", 409);
    }

    throw new AuthServiceError("Nao foi possivel criar a conta.", 500);
  }

  return {
    success: true as const,
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email ?? input.email,
          role: String(data.user.user_metadata?.role ?? input.role ?? "user"),
          email_confirmed_at: data.user.email_confirmed_at ?? null,
        }
      : null,
    needs_email_verification: !data.session,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at ?? null,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        }
      : null,
  };
}

export async function verifyEmailCode(input: VerifyEmailInput) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: "email",
  });

  if (error || !data.user) {
    throw new AuthServiceError("Codigo invalido ou expirado.", 422);
  }

  return {
    success: true as const,
    user: {
      id: data.user.id,
      email: data.user.email ?? input.email,
      role: String(data.user.user_metadata?.role ?? "user"),
      email_confirmed_at: data.user.email_confirmed_at ?? null,
    },
  };
}

export async function resendSignupCode(input: ResendSignupInput) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: input.email,
    options: {
      emailRedirectTo: getSignupRedirectUrl(input.redirect_to),
    },
  });

  if (error) {
    throw new AuthServiceError("Nao foi possivel reenviar o codigo.", 500);
  }

  return { success: true as const };
}

export async function requestPasswordReset(input: RequestPasswordResetInput) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: getPasswordResetRedirectUrl(input.redirect_to),
  });

  if (error) {
    throw new AuthServiceError("Nao foi possivel enviar o email de recuperacao.", 500);
  }

  return { success: true as const };
}

export async function updatePassword(userId: string, input: UpdatePasswordInput) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: input.password,
  });

  if (error) {
    throw new AuthServiceError("Nao foi possivel atualizar a senha.", 500);
  }

  return { success: true as const };
}

export function getAuthErrorPayload(error: unknown) {
  if (error instanceof AuthServiceError) {
    return {
      statusCode: error.statusCode,
      payload: error.details ? { error: error.message, errors: error.details } : { error: error.message },
    };
  }

  return {
    statusCode: 500,
    payload: { error: error instanceof Error ? error.message : "Erro interno de autenticacao." },
  };
}
