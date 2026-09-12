const MAX_WHATSAPP_MEDIA_BYTES = 10 * 1024 * 1024;

function getWhatsAppAccessToken(): string | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    console.error(
      "[whatsappMedia] Missing WHATSAPP_ACCESS_TOKEN."
    );
    return null;
  }

  return token;
}

function isSafeMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith("facebook.com")
    );
  } catch {
    return false;
  }
}

type WhatsAppMediaAsset = {
  buffer: Buffer;
  mimeType: string;
};

export async function downloadWhatsAppMediaWithMetadata(
  mediaId: string
): Promise<WhatsAppMediaAsset | null> {
  const token = getWhatsAppAccessToken();

  if (!token) {
    return null;
  }

  if (
    typeof mediaId !== "string" ||
    !mediaId.trim()
  ) {
    console.error(
      "[whatsappMedia] Invalid media ID."
    );
    return null;
  }

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(
        mediaId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!metaRes.ok) {
      console.error(
        `[whatsappMedia] Failed to fetch media metadata (${metaRes.status}).`
      );
      return null;
    }

    const meta =
      (await metaRes.json()) as Record<
        string,
        unknown
      >;

    const url = meta.url;

    if (!isSafeMediaUrl(url)) {
      console.error(
        "[whatsappMedia] Media metadata contained an invalid URL."
      );
      return null;
    }

    const declaredSize = Number(
      meta.file_size ??
        meta.size ??
        0
    );

    if (
      Number.isFinite(declaredSize) &&
      declaredSize >
        MAX_WHATSAPP_MEDIA_BYTES
    ) {
      console.warn(
        "[whatsappMedia] WhatsApp media exceeds size limit."
      );
      return null;
    }

    const fileRes =
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

    if (!fileRes.ok) {
      console.error(
        `[whatsappMedia] Failed to download media file (${fileRes.status}).`
      );
      return null;
    }

    const contentLength =
      Number(
        fileRes.headers.get(
          "content-length"
        ) ?? 0
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_WHATSAPP_MEDIA_BYTES
    ) {
      console.warn(
        "[whatsappMedia] Downloaded media exceeds size limit."
      );
      return null;
    }

    const arrayBuffer =
      await fileRes.arrayBuffer();

    if (
      arrayBuffer.byteLength >
      MAX_WHATSAPP_MEDIA_BYTES
    ) {
      console.warn(
        "[whatsappMedia] Downloaded media exceeds size limit."
      );
      return null;
    }

    if (
      arrayBuffer.byteLength === 0
    ) {
      console.warn(
        "[whatsappMedia] Downloaded media is empty."
      );
      return null;
    }

    const mimeType =
      typeof meta.mime_type ===
      "string"
        ? meta.mime_type
        : fileRes.headers.get(
            "content-type"
          ) ??
          "audio/ogg";

    return {
      buffer:
        Buffer.from(
          arrayBuffer
        ),
      mimeType,
    };
  } catch (error) {
    console.error(
      "[whatsappMedia] Media download with metadata error:",
      error
    );

    return null;
  }
}

export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<Buffer | null> {
  const token = getWhatsAppAccessToken();

  if (!token) {
    return null;
  }

  if (
    typeof mediaId !== "string" ||
    !mediaId.trim()
  ) {
    console.error(
      "[whatsappMedia] Invalid media ID."
    );
    return null;
  }

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(
        mediaId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!metaRes.ok) {
      console.error(
        `[whatsappMedia] Failed to fetch media metadata (${metaRes.status}).`
      );
      return null;
    }

    const meta = await metaRes.json();
    const url = meta?.url;

    if (!isSafeMediaUrl(url)) {
      console.error(
        "[whatsappMedia] Media metadata contained an invalid URL."
      );
      return null;
    }

    const declaredSize = Number(
      meta?.file_size ?? meta?.size ?? 0
    );

    if (
      Number.isFinite(declaredSize) &&
      declaredSize > MAX_WHATSAPP_MEDIA_BYTES
    ) {
      console.warn(
        "[whatsappMedia] WhatsApp media exceeds size limit."
      );
      return null;
    }

    const fileRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!fileRes.ok) {
      console.error(
        `[whatsappMedia] Failed to download media file (${fileRes.status}).`
      );
      return null;
    }

    const contentLength = Number(
      fileRes.headers.get("content-length") ?? 0
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_WHATSAPP_MEDIA_BYTES
    ) {
      console.warn(
        "[whatsappMedia] Downloaded media exceeds size limit."
      );
      return null;
    }

    const arrayBuffer =
      await fileRes.arrayBuffer();

    if (
      arrayBuffer.byteLength >
      MAX_WHATSAPP_MEDIA_BYTES
    ) {
      console.warn(
        "[whatsappMedia] Downloaded media exceeds size limit."
      );
      return null;
    }

    if (arrayBuffer.byteLength === 0) {
      console.warn(
        "[whatsappMedia] Downloaded media is empty."
      );
      return null;
    }

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(
      "[whatsappMedia] Media download error:",
      error
    );

    return null;
  }
}
