import type { NextRequest } from "next/server";

export type LimitedJsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" };

/**
 * Reads a request body as JSON without ever buffering more than `maxBytes`.
 * Unlike `request.json()` — which reads the whole body before any size check
 * can run — this cancels the stream and reports `too_large` the moment the
 * cumulative byte count crosses the cap, so an oversized upload can't be
 * fully parsed (or even fully received) before being rejected.
 */
export async function readJsonBodyWithLimit(
  request: NextRequest,
  maxBytes: number
): Promise<LimitedJsonBodyResult> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return { ok: false, reason: "too_large" };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    try {
      return { ok: true, data: await request.json() };
    } catch {
      return { ok: false, reason: "invalid_json" };
    }
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder().decode(buffer);
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
