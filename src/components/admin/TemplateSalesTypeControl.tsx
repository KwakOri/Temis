"use client";

import { useUpdateTemplateSalesType } from "@/hooks/query/useTemplateHub";
import { cva } from "class-variance-authority";

const classificationBadge = cva("rounded-full px-2 py-1 text-xs font-medium", {
  variants: {
    general: {
      true: "bg-green-50 text-green-700",
      false: "bg-gray-100 text-gray-600",
    },
  },
});

export default function TemplateSalesTypeControl({
  templateId,
  name,
  isPublic,
}: {
  templateId: string;
  name: string;
  isPublic: boolean;
}) {
  const mutation = useUpdateTemplateSalesType();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={classificationBadge({ general: isPublic })}>
        {isPublic ? "일반 템플릿" : "개인 템플릿"}
      </span>
      <button
        type="button"
        aria-label={`${name} ${isPublic ? "개인" : "일반"} 템플릿으로 전환`}
        disabled={mutation.isPending}
        className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        onClick={() =>
          mutation.mutate({
            templateId,
            salesType: isPublic ? "custom" : "general",
          })
        }
      >
        {mutation.isPending
          ? "변경 중…"
          : `${isPublic ? "개인" : "일반"} 템플릿으로 전환`}
      </button>
      {mutation.isError && (
        <span role="alert" className="text-xs text-red-600">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "분류를 변경하지 못했습니다."}
        </span>
      )}
    </div>
  );
}
