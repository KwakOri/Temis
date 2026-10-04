import { getProjectAssetManifest } from "@/services/server/projectAssetManifestService";
import { legacyAssetErrorResponse } from "@/app/api/admin/legacy-template-assets/_utils";
import { NextResponse } from "next/server";

// Read-only replacements for existing public cover files and the public homepage.
export async function GET() {
  try {
    return NextResponse.json(await getProjectAssetManifest(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return legacyAssetErrorResponse(error);
  }
}
