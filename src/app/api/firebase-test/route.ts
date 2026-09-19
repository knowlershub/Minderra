import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const idToken =
      typeof body?.idToken === "string"
        ? body.idToken.trim()
        : "";

    if (!idToken) {
      return Response.json(
        {
          error: "Firebase ID token is required.",
        },
        { status: 400 }
      );
    }

    const decodedToken =
      await getFirebaseAdminAuth().verifyIdToken(
        idToken
      );

    const provider =
      decodedToken.firebase
        ?.sign_in_provider;

    if (provider !== "google.com") {
      return Response.json(
        {
          error:
            "The authenticated Firebase provider is not Google.",
        },
        { status: 403 }
      );
    }

    return Response.json({
      ok: true,
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      name: decodedToken.name ?? null,
      emailVerified:
        decodedToken.email_verified === true,
      provider,
    });
  } catch (error) {
    console.error(
      "Firebase test verification failed:",
      error
    );

    return Response.json(
      {
        error:
          "Firebase ID token verification failed.",
      },
      { status: 401 }
    );
  }
}
