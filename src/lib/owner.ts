import { auth } from "@/auth";

const DEFAULT_OWNER_EMAIL = "knowlershub@gmail.com";

export function isOwnerEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;

  const ownerEmail = (
    process.env.MINDERRA_OWNER_EMAIL ??
    DEFAULT_OWNER_EMAIL
  ).trim().toLowerCase();

  return email.trim().toLowerCase() === ownerEmail;
}

export function isAdminEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();
  const admins = (process.env.MINDERRA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return isOwnerEmail(normalized) || admins.includes(normalized);
}

export async function getAdminSession() {
  const session = await auth();

  if (
    !session?.user?.email ||
    session.user.isAdmin !== true ||
    !isAdminEmail(session.user.email)
  ) {
    return null;
  }

  return session;
}
