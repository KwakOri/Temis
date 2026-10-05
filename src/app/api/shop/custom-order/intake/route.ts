import { getThumbnailOrderIntakeStatus } from "@/lib/custom-thumbnail-order";
import { getTimetableOrderIntakeStatus } from "@/services/server/customOrderIntakeService";
import { NextResponse } from "next/server";

// 로그인 전에도 실제 신청 처리와 같은 기준으로 접수 상태를 안내합니다.
export async function GET() {
  try {
    const [timetable, thumbnail] = await Promise.all([
      getTimetableOrderIntakeStatus(),
      getThumbnailOrderIntakeStatus(),
    ]);
    return NextResponse.json(
      { timetable, thumbnail },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "접수 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
