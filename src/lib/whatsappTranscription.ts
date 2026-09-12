const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    console.error(
      "[whatsappTranscription] Missing GEMINI_API_KEY."
    );

    return null;
  }

  return key;
}

function normalizeMimeType(
  value: string | null | undefined
): string {
  if (!value) {
    return "audio/ogg";
  }

  const normalized =
    value
      .split(";")[0]
      .trim()
      .toLowerCase();

  if (normalized === "audio/opus") {
    return "audio/opus";
  }

  if (normalized === "audio/ogg") {
    return "audio/ogg";
  }

  if (
    normalized === "audio/mpeg" ||
    normalized === "audio/mp3"
  ) {
    return "audio/mp3";
  }

  if (normalized === "audio/mp4") {
    return "audio/mp4";
  }

  if (normalized === "audio/webm") {
    return "audio/webm";
  }

  if (normalized === "audio/wav") {
    return "audio/wav";
  }

  if (normalized === "audio/flac") {
    return "audio/flac";
  }

  return normalized.startsWith("audio/")
    ? normalized
    : "audio/ogg";
}

export async function transcribeWhatsAppAudio(
  audio: Buffer,
  mimeType?: string | null
): Promise<string | null> {
  const apiKey =
    getGeminiApiKey();

  if (!apiKey) {
    return null;
  }

  if (!audio.length) {
    console.warn(
      "[whatsappTranscription] Audio is empty."
    );

    return null;
  }

  if (
    audio.length >
    MAX_AUDIO_BYTES
  ) {
    console.warn(
      "[whatsappTranscription] Audio exceeds size limit."
    );

    return null;
  }

  const normalizedMimeType =
    normalizeMimeType(mimeType);

  const response =
    await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType:
                      normalizedMimeType,
                    data: audio.toString(
                      "base64"
                    ),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            audioTranscriptionConfig: {
              mode: "SMART",
            },
          },
        }),
        cache: "no-store",
      }
    );

  if (!response.ok) {
    const errorBody =
      await response.text();

    console.error(
      `[whatsappTranscription] Gemini request failed (${response.status}): ${errorBody}`
    );

    return null;
  }

  const result =
    (await response.json()) as Record<
      string,
      unknown
    >;

  const candidates =
    Array.isArray(
      result.candidates
    )
      ? result.candidates
      : [];

  const candidate =
    candidates[0];

  if (
    !candidate ||
    typeof candidate !==
      "object"
  ) {
    return null;
  }

  const candidateRecord =
    candidate as Record<
      string,
      unknown
    >;

  const content =
    candidateRecord.content;

  if (
    !content ||
    typeof content !==
      "object"
  ) {
    return null;
  }

  const contentRecord =
    content as Record<
      string,
      unknown
    >;

  const parts =
    Array.isArray(
      contentRecord.parts
    )
      ? contentRecord.parts
      : [];

  for (const part of parts) {
    if (
      !part ||
      typeof part !==
        "object"
    ) {
      continue;
    }

    const partRecord =
      part as Record<
        string,
        unknown
      >;

    if (
      typeof partRecord.text ===
      "string"
    ) {
      const text =
        partRecord.text.trim();

      if (text) {
        return text;
      }
    }
  }

  return null;
}
