import { auth } from "@/auth";

const DEFAULT_OWNER_EMAIL = "knowlershub@gmail.com";

export function isOwnerEmail(
  email: string | null | undefined
): boolean {
  if (!email) {
    return false;
  }

  const ownerEmail = (
    process.env.MINDERRA_OWNER_EMAIL ??
    DEFAULT_OWNER_EMAIL
  ).trim().toLowerCase();

  return (
    ownerEmail.length > 0 &&
    email.trim().toLowerCase() === ownerEmail
  );
}

export async function getOwnerSession() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  // Verify identity on the server. The badge/navigation alone
  // never grants access to the administration page.
  return isOwnerEmail(session.user.email) ? session : null;
}
