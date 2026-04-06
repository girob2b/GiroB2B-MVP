import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres.");

const optionalTrimmedString = z
  .string()
  .trim()
  .transform(value => value || undefined)
  .optional();

export const LoginSchema = z.object({
  email: z.string().trim().email("Email invalido."),
  password: passwordSchema,
});

export const RegisterSchema = z.object({
  email: z.string().trim().email("Email invalido."),
  password: passwordSchema,
  full_name: optionalTrimmedString,
  phone: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalTrimmedString,
  role: z.enum(["user", "buyer", "supplier"]).optional(),
  redirect_to: z.string().url("URL de redirecionamento invalida.").optional(),
});

export const VerifyEmailSchema = z.object({
  email: z.string().trim().email("Email invalido."),
  token: z.string().trim().length(6, "Informe o codigo de 6 digitos."),
});

export const ResendSignupSchema = z.object({
  email: z.string().trim().email("Email invalido."),
  redirect_to: z.string().url("URL de redirecionamento invalida.").optional(),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().trim().email("Email invalido."),
  redirect_to: z.string().url("URL de redirecionamento invalida.").optional(),
});

export const UpdatePasswordSchema = z.object({
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendSignupInput = z.infer<typeof ResendSignupSchema>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
