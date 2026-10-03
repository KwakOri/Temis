import { NextResponse } from "next/server";
import {
  LegacyAssetError,
  parseLegacyAssetOwner,
} from "@/utils/legacy-template-assets/contracts";

export const assetOwnerFromParams = async (
  params: Promise<{ ownerKind: string; id: string }>,
) => {
  const { ownerKind, id } = await params;
  return parseLegacyAssetOwner(ownerKind, id);
};
export const legacyAssetResponse = (value: unknown) =>
  NextResponse.json(value, {
    headers: { "Cache-Control": "private, no-store" },
  });
export const legacyAssetErrorResponse = (error: unknown) =>
  NextResponse.json(
    {
      error:
        error instanceof LegacyAssetError
          ? error.message
          : "에셋 처리에 실패했습니다. 연결과 설정을 확인해 주세요.",
    },
    {
      status: error instanceof LegacyAssetError ? error.status : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );

export async function readLegacyAssetRequest(
  request: Request,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new LegacyAssetError("작업 정보가 필요합니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256 * 1024) {
        await reader.cancel();
        throw new LegacyAssetError("요청이 너무 큽니다.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof LegacyAssetError) throw error;
    throw new LegacyAssetError("요청 형식이 올바르지 않습니다.");
  } finally {
    reader.releaseLock();
  }
}
