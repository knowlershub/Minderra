import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  parseCommand,
  routeCommand,
} from "@/lib/commandRouter";
import {
  parseIncomingWhatsAppTextMessage,
} from "@/lib/whatsapp/parseIncomingMessage";
import {
  transcribeWhatsAppAudio,
} from "@/lib/whatsappTranscription";
import { handleForwardedSms } from "@/lib/handlers/smsForward";
import {
  handlePendingReceiptReply,
  handleReceiptImage,
} from "@/lib/handlers/receiptOcr";
import {
  downloadWhatsAppMedia,
  downloadWhatsAppMediaWithMetadata,
} from "@/lib/whatsappMedia";
import {
  sendWhatsAppMessage,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function verifyWhatsAppSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const appSecret =
    process.env.WHATSAPP_APP_SECRET;

  if (!appSecret || !signature) {
    return false;
  }

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const providedHex =
    signature.slice("sha256=".length);

  if (!/^[0-9a-f]{64}$/i.test(providedHex)) {
    return false;
  }

  const expectedHex =
    createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

  const providedBuffer =
    Buffer.from(providedHex, "hex");

  const expectedBuffer =
    Buffer.from(expectedHex, "hex");

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

export async function GET(
  req: NextRequest
) {
  const mode =
    req.nextUrl.searchParams.get(
      "hub.mode"
    );

  const token =
    req.nextUrl.searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    req.nextUrl.searchParams.get(
      "hub.challenge"
    );

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    token &&
    expectedToken &&
    token === expectedToken &&
    challenge
  ) {
    return new NextResponse(
      challenge,
      {
        status: 200,
      }
    );
  }

  return new NextResponse(
    "Forbidden",
    {
      status: 403,
    }
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const rawBody =
      await req.text();

    const signature =
      req.headers.get(
        "x-hub-signature-256"
      );

    if (
      !verifyWhatsAppSignature(
        rawBody,
        signature
      )
    ) {
      console.warn(
        "[whatsapp webhook] Invalid signature."
      );

      return new NextResponse(
        "Forbidden",
        {
          status: 403,
        }
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          status: "invalid_json",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json({
        status: "ignored",
      });
    }

    const payload =
      body as Record<string, unknown>;

    const entry =
      Array.isArray(payload.entry)
        ? payload.entry[0]
        : null;

    if (
      !entry ||
      typeof entry !== "object"
    ) {
      return NextResponse.json({
        status: "ignored",
      });
    }

    const changesValue =
      (entry as Record<string, unknown>)
        .changes;

    const changes: unknown[] =
      Array.isArray(changesValue)
        ? changesValue
        : [];

    const change =
      changes[0];

    if (
      !change ||
      typeof change !== "object"
    ) {
      return NextResponse.json({
        status: "ignored",
      });
    }

    const changeValue =
      (change as Record<
        string,
        unknown
      >).value;

    if (
      !changeValue ||
      typeof changeValue !== "object"
    ) {
      return NextResponse.json({
        status: "ignored",
      });
    }

    const value =
      changeValue as Record<
        string,
        unknown
      >;

    const messages =
      Array.isArray(value.messages)
        ? value.messages
        : [];

    const message =
      messages[0];

    if (
      !message ||
      typeof message !== "object"
    ) {
      return NextResponse.json({
        status: "ignored",
      });
    }

    const incomingMessage =
      message as Record<
        string,
        unknown
      >;

    const from =
      typeof incomingMessage.from ===
      "string"
        ? incomingMessage.from.trim()
        : "";

    if (!from) {
      return NextResponse.json(
        {
          status: "invalid_message",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Only a WhatsApp number that is already
     * connected to a Minderra user may be
     * processed as user content.
     *
     * This deliberately replaces the previous
     * getOrCreateUser("whatsapp", from) behavior.
     */
    const user =
      await prisma.user.findUnique({
        where: {
          whatsappId: from,
        },
        select: {
          id: true,
          whatsappId: true,
        },
      });

    if (!user) {
      console.warn(
        `[whatsapp webhook] Ignoring message from unlinked WhatsApp number: ${from}`
      );

      return NextResponse.json({
        status: "unlinked_user",
      });
    }

    const messageType =
      typeof incomingMessage.type ===
      "string"
        ? incomingMessage.type
        : "";

    const messageId =
      typeof incomingMessage.id ===
      "string"
        ? incomingMessage.id.trim()
        : null;

    const timestampValue =
      typeof incomingMessage.timestamp ===
      "string"
        ? Number(incomingMessage.timestamp)
        : NaN;

    const sentAt =
      Number.isFinite(timestampValue)
        ? new Date(timestampValue * 1000)
        : new Date();

    if (messageId) {
      const existing =
        await prisma.whatsAppMessage.findUnique({
          where: {
            messageId,
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        return NextResponse.json({
          status: "duplicate",
        });
      }
    }

    if (messageType === "audio") {
      const audioPayload =
        incomingMessage.audio;

      const audioObject =
        audioPayload &&
        typeof audioPayload === "object"
          ? (audioPayload as Record<
              string,
              unknown
            >)
          : null;

      const mediaId =
        typeof audioObject?.id ===
        "string"
          ? audioObject.id.trim()
          : "";

      if (!mediaId) {
        await sendWhatsAppMessage(
          from,
          "I received your voice note, but I couldn't access the audio."
        );

        return NextResponse.json({
          status: "invalid_audio",
        });
      }

      const audio =
        await downloadWhatsAppMediaWithMetadata(
          mediaId
        );

      if (!audio) {
        await sendWhatsAppMessage(
          from,
          "I received your voice note, but I couldn't download the audio. Please try again."
        );

        return NextResponse.json({
          status: "audio_download_failed",
        });
      }

      const text =
        await transcribeWhatsAppAudio(
          audio.buffer,
          audio.mimeType
        );

      if (!text) {
        await sendWhatsAppMessage(
          from,
          "I couldn't understand that voice note. Please try speaking again or send the message as text."
        );

        return NextResponse.json({
          status: "transcription_failed",
        });
      }

      console.info(
        `[whatsapp webhook] Transcribed voice note from ${from}: ${text}`
      );

      await prisma.whatsAppMessage.create({
        data: {
          userId: user.id,
          messageId,
          direction: "inbound",
          messageType: "audio",
          body: text,
          sentAt,
        },
      });

      const pendingReceiptReply =
        await handlePendingReceiptReply(
          user.id,
          text
        );

      const parsed =
        parseCommand(text);

      const reply =
        pendingReceiptReply ??
        (
          parsed
            ? await routeCommand(
                user.id,
                parsed
              )
            : await handleForwardedSms(
                user.id,
                text
              )
        );

      await sendWhatsAppMessage(
        from,
        reply
      );

      return NextResponse.json({
        status: "ok",
        type: "audio",
        transcript: text,
      });
    }

    if (messageType === "image") {
      const image =
        incomingMessage.image;

      const imagePayload =
        image &&
        typeof image === "object"
          ? image as Record<
              string,
              unknown
            >
          : null;

      const mediaId =
        typeof imagePayload?.id ===
        "string"
          ? imagePayload.id.trim()
          : "";

      const caption =
        typeof imagePayload?.caption ===
        "string"
          ? imagePayload.caption.trim()
          : null;

      await prisma.whatsAppMessage.create({
        data: {
          userId: user.id,
          messageId,
          direction: "inbound",
          messageType: "image",
          body: caption,
          mediaId:
            mediaId || null,
          sentAt,
        },
      });

      if (!mediaId) {
        await sendWhatsAppMessage(
          from,
          "Couldn't read that image. Please send the receipt photo again."
        );

        return NextResponse.json({
          status: "missing_media_id",
        });
      }

      const imageBuffer =
        await downloadWhatsAppMedia(
          mediaId
        );

      if (!imageBuffer) {
        await sendWhatsAppMessage(
          from,
          "I couldn't download that receipt. Please send a clearer or smaller image and try again."
        );

        return NextResponse.json({
          status: "download_failed",
        });
      }

      /*
       * Receipt OCR is now only reachable after
       * the WhatsApp sender has been proven to
       * belong to an existing Minderra user.
       */
      const reply =
        await handleReceiptImage(
          user.id,
          imageBuffer
        );

      await sendWhatsAppMessage(
        from,
        reply
      );

      return NextResponse.json({
        status: "ok",
      });
    }

    if (messageType !== "text") {
      await prisma.whatsAppMessage.create({
        data: {
          userId: user.id,
          messageId,
          direction: "inbound",
          messageType:
            messageType || "unknown",
          sentAt,
        },
      });

      await sendWhatsAppMessage(
        from,
        "I can currently read text messages and receipt photos. Voice notes and other media types aren't supported yet."
      );

      return NextResponse.json({
        status: "unsupported_type",
      });
    }

    const parsedIncomingMessage =
      parseIncomingWhatsAppTextMessage(
        body
      );

    const text =
      parsedIncomingMessage?.text ??
      "";

    if (!text) {
      return NextResponse.json({
        status: "empty_message",
      });
    }

    await prisma.whatsAppMessage.create({
      data: {
        userId: user.id,
        messageId,
        direction: "inbound",
        messageType: "text",
        body: text,
        sentAt,
      },
    });

    const pendingReceiptReply =
      await handlePendingReceiptReply(
        user.id,
        text
      );

    const parsed =
      parseCommand(text);

    const reply =
      pendingReceiptReply ??
      (
        parsed
          ? await routeCommand(
              user.id,
              parsed
            )
          : await handleForwardedSms(
              user.id,
              text
            )
      );

    await sendWhatsAppMessage(
      from,
      reply
    );

    return NextResponse.json({
      status: "ok",
    });
  } catch (error) {
    console.error(
      "[whatsapp webhook] Error handling message:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
      },
      {
        status: 500,
      }
    );
  }
}
