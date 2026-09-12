import { createHmac, timingSafeEqual } from "crypto";

const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

const OAUTH_STATE_TTL_MS =
  10 * 60 * 1000;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is required for Gmail OAuth state signing."
    );
  }

  return secret;
}

function base64UrlEncode(
  value: string
): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(
  value: string
): string {
  return Buffer.from(
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function signState(
  payload: string
): string {
  const signature = createHmac(
    "sha256",
    getAuthSecret()
  )
    .update(payload)
    .digest("base64");

  return base64UrlEncode(signature);
}

export function createGmailOAuthState(
  userId: string
): string {
  const payload = JSON.stringify({
    userId,
    createdAt: Date.now(),
  });

  const encodedPayload =
    base64UrlEncode(payload);

  const signature =
    signState(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyGmailOAuthState(
  state: string
): string | null {
  try {
    const parts = state.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [
      encodedPayload,
      encodedSignature,
    ] = parts;

    const expectedSignature =
      signState(encodedPayload);

    const actualBuffer =
      Buffer.from(encodedSignature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      actualBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !timingSafeEqual(
        actualBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      base64UrlDecode(encodedPayload)
    );

    if (
      typeof payload?.userId !== "string" ||
      !payload.userId
    ) {
      return null;
    }

    if (
      typeof payload?.createdAt !==
      "number"
    ) {
      return null;
    }

    if (
      Date.now() - payload.createdAt >
      OAUTH_STATE_TTL_MS
    ) {
      return null;
    }

    if (
      payload.createdAt >
      Date.now() + 60 * 1000
    ) {
      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error(
      "[googleOAuth] Invalid OAuth state:",
      error
    );

    return null;
  }
}

function getGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID ??
    process.env.AUTH_GOOGLE_ID ??
    ""
  );
}

function getGoogleClientSecret(): string {
  return (
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.AUTH_GOOGLE_SECRET ??
    ""
  );
}

function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.APP_BASE_URL ?? "https://minderra.onrender.com"}/api/auth/gmail/callback`
  );
}

export function getGmailAuthUrl(
  state: string
): string {
  const clientId =
    getGoogleClientId();

  const redirectUri =
    getGoogleRedirectUri();

  if (!clientId) {
    throw new Error(
      "Google OAuth client ID is not configured."
    );
  }

  if (!redirectUri) {
    throw new Error(
      "Google OAuth redirect URI is not configured."
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getGoogleAuthUrl(
  state: string
): string {
  return getGmailAuthUrl(state);
}

export type GmailTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export async function exchangeCodeForTokens(
  code: string
): Promise<GmailTokens | null> {
  const res = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id:
          getGoogleClientId(),
        client_secret:
          getGoogleClientSecret(),
        redirect_uri:
          getGoogleRedirectUri(),
        grant_type:
          "authorization_code",
      }),
    }
  );

  if (!res.ok) {
    console.error(
      `[googleOAuth] Token exchange failed (${res.status}): ${await res.text()}`
    );
    return null;
  }

  const data = await res.json();

  if (
    !data.access_token ||
    !data.refresh_token ||
    !data.expires_in
  ) {
    console.error(
      "[googleOAuth] Token response is missing required fields."
    );
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(
      Date.now() +
        data.expires_in * 1000
    ),
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresAt: Date;
} | null> {
  const res = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id:
          getGoogleClientId(),
        client_secret:
          getGoogleClientSecret(),
        grant_type: "refresh_token",
      }),
    }
  );

  if (!res.ok) {
    console.error(
      `[googleOAuth] Token refresh failed (${res.status}): ${await res.text()}`
    );
    return null;
  }

  const data = await res.json();

  if (
    !data.access_token ||
    !data.expires_in
  ) {
    console.error(
      "[googleOAuth] Token refresh response is missing required fields."
    );
    return null;
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(
      Date.now() +
        data.expires_in * 1000
    ),
  };
}

export async function fetchGmailAddress(
  accessToken: string
): Promise<string | null> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    console.error(
      `[googleOAuth] Failed to fetch Gmail profile (${res.status}): ${await res.text()}`
    );
    return null;
  }

  const data = await res.json();

  return data.emailAddress ?? null;
}
