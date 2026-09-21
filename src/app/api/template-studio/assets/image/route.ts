import { downloadFileFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

const normalizePath = (value: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized === "/") return "";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}`;
};

const resolveR2ObjectKey = (rawUrl: string): string | null => {
  const publicUrl =
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!publicUrl) return null;

  let requested: URL;
  let configured: URL;
  try {
    requested = new URL(rawUrl);
    configured = new URL(publicUrl);
  } catch {
    return null;
  }

  if (requested.origin !== configured.origin) return null;

  const basePath = normalizePath(configured.pathname);
  let requestedPath: string;
  try {
    requestedPath = decodeURIComponent(requested.pathname);
  } catch {
    return null;
  }
  if (basePath && !requestedPath.startsWith(`${basePath}/`)) return null;

  const key = requestedPath.slice(basePath.length).replace(/^\/+/, "");
  return key && !key.includes("..") ? key : null;
};

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json(
      { error: "이미지 URL이 필요합니다." },
      { status: 400 },
    );
  }

  const objectKey = resolveR2ObjectKey(rawUrl);
  if (!objectKey) {
    return NextResponse.json(
      { error: "허용되지 않은 이미지 URL입니다." },
      { status: 400 },
    );
  }

  try {
    const { buffer, contentType, contentLength } =
      await downloadFileFromR2(objectKey);
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 불러올 수 있습니다." },
        { status: 415 },
      );
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(contentLength),
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("Template Studio image proxy error:", error);
    return NextResponse.json(
      { error: "이미지를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
