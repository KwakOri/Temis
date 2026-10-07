"use client";

import { TemplateStudioAdminListClient } from "@/app/(root)/admin/template-studio/_components/template-studio-admin-list-client";
import AdminSectionTabs from "@/components/admin/AdminSectionTabs";
import { useRouter, useSearchParams } from "next/navigation";

const sections = [
  { value: "timetable", label: "시간표" },
  { value: "team", label: "팀시간표" },
  { value: "thumbnail", label: "썸네일" },
] as const;
type StudioSection = (typeof sections)[number]["value"];

export default function StudioTemplateManagement({
  initialSection = "timetable",
}: {
  initialSection?: StudioSection;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const section =
    sections.find((item) => item.value === params.get("section"))?.value ??
    initialSection;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quaternary">템플릿 관리</h1>
      <AdminSectionTabs
        id="studio-templates"
        label="템플릿 종류"
        items={sections}
        value={section}
        onChange={(value) =>
          router.push(`/admin/studio-templates?section=${value}`)
        }
      />
      <div
        role="tabpanel"
        id={`studio-templates-panel-${section}`}
        aria-labelledby={`studio-templates-tab-${section}`}
      >
        <TemplateStudioAdminListClient
          key={section}
          templateKind={section === "thumbnail" ? "thumbnail" : "timetable"}
          templateMode={section === "team" ? "team" : "personal"}
        />
      </div>
    </div>
  );
}
