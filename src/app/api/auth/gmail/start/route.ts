import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { resolveApiUser } from "@/lib/apiAuth";
import {
  createGmailOAuthState,
  getGoogleAuthUrl,
} from "@/lib/googleOAuth";

export async function GET(
  req: NextRequest
) {
  try {
    const resolved =
      await resolveApiUser();

    if (resolved.status !== 200) {
      return NextResponse.json(
        {
          error: resolved.error,
        },
        {
          status: resolved.status,
        }
      );
    }

    const userId = resolved.user.id;

    const state =
      createGmailOAuthState(userId);

    const authUrl =
      getGoogleAuthUrl(state);

    const authUrlObject =
      new URL(authUrl);

    console.info(
      "[gmail oauth] Production authorization configuration:",
      {
        clientId:
          authUrlObject.searchParams.get(
            "client_id"
          ),
        redirectUri:
          authUrlObject.searchParams.get(
            "redirect_uri"
          ),
      }
    );

    return NextResponse.redirect(
      authUrl
    );
  } catch (error) {
    console.error(
      "Gmail OAuth start error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start Gmail connection.",
      },
      {
        status: 500,
      }
    );
  }
}
