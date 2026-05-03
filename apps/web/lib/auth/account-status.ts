export const ACCOUNT_STATUS_ACTIVE = "ativa";
export const ACCOUNT_STATUS_SUSPENDED = "suspensa";

export type AccountStatus =
  | typeof ACCOUNT_STATUS_ACTIVE
  | typeof ACCOUNT_STATUS_SUSPENDED;

export function normalizeAccountStatus(
  rawStatus: string | null | undefined,
  fallbackSuspended = false
): AccountStatus {
  const normalized = (rawStatus ?? "").trim().toLowerCase();

  if (normalized === ACCOUNT_STATUS_SUSPENDED || normalized === "suspended") {
    return ACCOUNT_STATUS_SUSPENDED;
  }

  if (normalized === ACCOUNT_STATUS_ACTIVE || normalized === "active") {
    return ACCOUNT_STATUS_ACTIVE;
  }

  return fallbackSuspended ? ACCOUNT_STATUS_SUSPENDED : ACCOUNT_STATUS_ACTIVE;
}

export function isSuspendedAccountStatus(
  rawStatus: string | null | undefined,
  fallbackSuspended = false
) {
  return normalizeAccountStatus(rawStatus, fallbackSuspended) === ACCOUNT_STATUS_SUSPENDED;
}

export function isMissingAccountStatusColumnError(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("user_profiles") && normalized.includes("status");
}
