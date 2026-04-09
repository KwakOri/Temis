"use client";

import React from "react";

interface TemplateSimplePropertiesSectionProps {
  heading: string;
  section: string;
  bindableNodeLabels: string[];
  cardComponentProperties: React.ReactNode;
  styleEditor: React.ReactNode;
}

const TemplateSimplePropertiesSection: React.FC<
  TemplateSimplePropertiesSectionProps
> = ({
  heading,
  section,
  bindableNodeLabels,
  cardComponentProperties,
  styleEditor,
}) => {
  return (
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <h4 className="font-semibold text-sm text-gray-200">{heading}</h4>
      {section === "cardContainer" ? (
        <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
          바인딩 키는 카드 컨테이너가 아니라 하위 텍스트 오브젝트에서 설정합니다.
          {bindableNodeLabels.length > 0
            ? ` (${bindableNodeLabels.join(", ")})`
            : ""}
        </div>
      ) : null}
      {cardComponentProperties}
      {styleEditor}
    </div>
  );
};

export default TemplateSimplePropertiesSection;
