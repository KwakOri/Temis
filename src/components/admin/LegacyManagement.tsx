"use client";

import AdminSectionTabs from "@/components/admin/AdminSectionTabs";
import TeamManagement from "@/components/admin/TeamManagement";
import TeamTemplateManagement from "@/components/admin/TeamTemplateManagement";
import ThumbnailManagement from "@/components/admin/ThumbnailManagement";
import { LegacyAssetList } from "@/components/admin/legacy-template-assets/LegacyAssetList";
import { useRouter, useSearchParams } from "next/navigation";

const sections = [
  { value: "thumbnails", label: "썸네일 관리" },
  { value: "teamTemplates", label: "팀 템플릿" },
  { value: "assets", label: "레거시 에셋" },
  { value: "teams", label: "레거시 팀 관리" },
] as const;
type LegacySection = (typeof sections)[number]["value"];

export default function LegacyManagement({
  initialSection = "thumbnails",
}: {
  initialSection?: LegacySection;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const section =
    sections.find((item) => item.value === params.get("section"))?.value ??
    initialSection;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quaternary">레거시</h1>
      <AdminSectionTabs
        id="legacy"
        label="레거시 관리 메뉴"
        items={sections}
        value={section}
        onChange={(value) => router.push(`/admin/legacy?section=${value}`)}
      />
      <div
        role="tabpanel"
        id={`legacy-panel-${section}`}
        aria-labelledby={`legacy-tab-${section}`}
      >
        {section === "thumbnails" ? (
          <ThumbnailManagement />
        ) : section === "teamTemplates" ? (
          <TeamTemplateManagement />
        ) : section === "assets" ? (
          <LegacyAssetList />
        ) : (
          <TeamManagement scope="legacy" />
        )}
      </div>
    </div>
  );
}
