import type { JWTPayload } from "@/lib/auth/jwt";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { TemplateService } from "@/lib/templates";
import type { LegacyAssetOwner } from "@/types/legacy-template-assets";
import { LegacyAssetError } from "@/utils/legacy-template-assets/contracts";

export async function requireLegacyAssetRuntimeAccess(
  owner: LegacyAssetOwner,
  user: JWTPayload | null,
): Promise<void> {
  if (user?.role === "admin") return;
  if (owner.ownerKind === "site" || owner.purpose === "cover")
    throw new LegacyAssetError(
      "이 관리 에셋은 관리자만 조회할 수 있습니다.",
      403,
    );
  // The sole legacy thumbnail route is public today; do not introduce a Studio entitlement here.
  if (owner.ownerKind === "thumbnail") return;
  if (!user) throw new LegacyAssetError("로그인이 필요합니다.", 401);
  if (owner.ownerKind === "timetable") {
    if (
      !(await TemplateService.resolveEntitlement(owner.templateId, user))
        .hasAccess
    )
      throw new LegacyAssetError("템플릿 이용 권한이 없습니다.", 403);
    return;
  }
  const userId = Number(user.userId);
  if (!Number.isSafeInteger(userId) || userId < 1)
    throw new LegacyAssetError("유효한 사용자 정보가 필요합니다.", 401);
  const relations = await supabaseAdminServer
    .from("relations_team_template_and_team")
    .select("team_id")
    .eq("team_template_id", owner.templateId);
  if (relations.error)
    throw new LegacyAssetError("팀 접근 권한을 확인하지 못했습니다.", 503);
  if (!relations.data?.length)
    throw new LegacyAssetError("연결된 팀이 없습니다.", 403);
  const membership = await supabaseAdminServer
    .from("team_members")
    .select("id")
    .in(
      "team_id",
      relations.data.map((row) => row.team_id),
    )
    .eq("user_id", userId)
    .limit(1);
  if (membership.error)
    throw new LegacyAssetError("팀 접근 권한을 확인하지 못했습니다.", 503);
  if (!membership.data?.length)
    throw new LegacyAssetError("팀 멤버만 이용할 수 있습니다.", 403);
}
