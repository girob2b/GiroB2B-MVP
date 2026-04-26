import type { User } from "@supabase/supabase-js";

const OWNER_EMAILS = new Set(
  (process.env.GIROB2B_OWNER_EMAILS ?? "vitordsb2019@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.has(email.toLowerCase());
}

export interface WebSearchAccessProfile {
  can_use_web_search?: boolean | null;
}

export function canUseWebSearch(
  user: Pick<User, "email"> | null | undefined,
  profile: WebSearchAccessProfile | null | undefined
): boolean {
  if (!user) return false;
  if (isOwnerEmail(user.email)) return true;
  return profile?.can_use_web_search === true;
}
