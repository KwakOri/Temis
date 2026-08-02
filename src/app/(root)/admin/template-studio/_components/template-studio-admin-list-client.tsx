"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useDeleteTemplateStudioTemplate,
  useTemplateStudioTemplates,
} from "@/hooks/query/useTemplateStudio";
import { cn } from "@/lib/utils";
import type { TemplateStudioTemplateRecord } from "@/services/server/templateStudioPersistenceService";
import type { StudioTemplateKind } from "@/types/template-studio";
import {
  ArrowUpRight,
  Edit,
  Eye,
  LayoutTemplate,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadgeStyles: Record<
  TemplateStudioTemplateRecord["status"],
  string
> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-200 text-gray-600",
};

const statusLabels: Record<TemplateStudioTemplateRecord["status"], string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

const StatusBadge = ({
  status,
}: {
  status: TemplateStudioTemplateRecord["status"];
}) => (
  <span
    className={cn(
      "inline-flex px-2 py-0.5 text-xs font-semibold rounded-full",
      statusBadgeStyles[status],
    )}
  >
    {statusLabels[status]}
  </span>
);

const RowActions = ({
  template,
  onDelete,
  isDeleting,
  basePath,
}: {
  template: TemplateStudioTemplateRecord;
  onDelete: (template: TemplateStudioTemplateRecord) => void;
  isDeleting: boolean;
  basePath: string;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Link
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
      href={`${basePath}/${template.id}/edit`}
    >
      <Edit className="h-3.5 w-3.5" />
      수정
    </Link>
    {template.status === "published" ? (
      <Link
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0]"
        href={`${basePath}/${template.id}/preview`}
      >
        <Eye className="h-3.5 w-3.5" />
        미리보기
      </Link>
    ) : (
      <span
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium cursor-not-allowed bg-gray-50 text-gray-400 border border-gray-100"
        title="게시된 템플릿만 미리볼 수 있습니다."
      >
        <Eye className="h-3.5 w-3.5" />
        미리보기
      </span>
    )}
    <Link
      className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      href={`${basePath}/${template.id}/edit`}
      target="_blank"
      title="새 탭에서 열기"
    >
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
    <button
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isDeleting}
      title="템플릿 삭제"
      type="button"
      onClick={() => onDelete(template)}
    >
      <Trash2 className="h-3.5 w-3.5" />
      삭제
    </button>
  </div>
);

export function TemplateStudioAdminListClient({
  templateKind = "timetable",
}: {
  templateKind?: StudioTemplateKind;
} = {}) {
  const isThumbnail = templateKind === "thumbnail";
  const basePath = isThumbnail
    ? "/admin/thumbnail-studio"
    : "/admin/template-studio";
  const createHref = `${basePath}/create`;
  const templatesQuery = useTemplateStudioTemplates(templateKind);
  const deleteTemplateMutation = useDeleteTemplateStudioTemplate();
  const templates = templatesQuery.data?.templates ?? [];

  const handleDelete = (template: TemplateStudioTemplateRecord) => {
    if (
      !confirm(
        `"${template.name}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    deleteTemplateMutation.mutate(template.id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminTabHeader
        description={
          isThumbnail
            ? "썸네일 템플릿을 만들고 초안, 게시, 미리보기 상태를 관리하세요"
            : "시간표 템플릿을 만들고 초안, 게시, 미리보기 상태를 관리하세요"
        }
        icon={LayoutTemplate}
        title={isThumbnail ? "Thumbnail Studio" : "Template Studio"}
      >
        <div className="bg-quaternary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border">
          <span className="text-[#F4FDFF] font-semibold text-sm sm:text-base">
            총 {templates.length}개
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          disabled={templatesQuery.isFetching}
          type="button"
          onClick={() => {
            void templatesQuery.refetch();
          }}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              templatesQuery.isFetching && "animate-spin",
            )}
          />
          새로고침
        </button>
        <Link
          className="bg-primary text-[#F4FDFF] px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base hover:bg-secondary transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
          href={createHref}
        >
          <Plus className="h-4 w-4" />새 템플릿
        </Link>
      </AdminTabHeader>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  템플릿
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  업데이트
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22rem]">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templatesQuery.isLoading ? (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                    colSpan={3}
                  >
                    템플릿 목록을 불러오는 중...
                  </td>
                </tr>
              ) : templatesQuery.isError ? (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-red-700 text-sm"
                    colSpan={3}
                  >
                    {templatesQuery.error instanceof Error
                      ? templatesQuery.error.message
                      : "템플릿 목록을 불러오지 못했습니다."}
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center" colSpan={3}>
                    <LayoutTemplate className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm mb-4">
                      {isThumbnail
                        ? "아직 생성된 Thumbnail Studio 템플릿이 없습니다."
                        : "아직 생성된 Template Studio 템플릿이 없습니다."}
                    </p>
                    <Link
                      className="inline-flex items-center gap-1.5 bg-primary text-[#F4FDFF] px-4 py-2 rounded-md font-medium text-sm hover:bg-secondary transition-colors"
                      href={createHref}
                    >
                      <Plus className="h-4 w-4" />첫 템플릿 만들기
                    </Link>
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr className="hover:bg-gray-50" key={template.id}>
                    <td className="px-4 py-4 align-top">
                      <div className="max-w-md">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {template.name}
                          </span>
                          <StatusBadge status={template.status} />
                        </div>
                        {template.description ? (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {template.description}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {template.id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatDateTime(template.updatedAt)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <RowActions
                        basePath={basePath}
                        isDeleting={
                          deleteTemplateMutation.isPending &&
                          deleteTemplateMutation.variables === template.id
                        }
                        template={template}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden divide-y divide-gray-200">
          {templatesQuery.isLoading ? (
            <div className="px-4 py-12 text-center">
              <p className="text-gray-500 text-sm">
                템플릿 목록을 불러오는 중...
              </p>
            </div>
          ) : templatesQuery.isError ? (
            <div className="px-4 py-12 text-center">
              <p className="text-red-700 text-sm">
                {templatesQuery.error instanceof Error
                  ? templatesQuery.error.message
                  : "템플릿 목록을 불러오지 못했습니다."}
              </p>
            </div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <LayoutTemplate className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm mb-4">
                {isThumbnail
                  ? "아직 생성된 Thumbnail Studio 템플릿이 없습니다."
                  : "아직 생성된 Template Studio 템플릿이 없습니다."}
              </p>
              <Link
                className="inline-flex items-center gap-1.5 bg-primary text-[#F4FDFF] px-4 py-2 rounded-md font-medium text-sm hover:bg-secondary transition-colors"
                href={createHref}
              >
                <Plus className="h-4 w-4" />첫 템플릿 만들기
              </Link>
            </div>
          ) : (
            templates.map((template) => (
              <div className="p-4 space-y-3" key={template.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {template.name}
                    </span>
                    <StatusBadge status={template.status} />
                  </div>
                  {template.description ? (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {template.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-1">
                    업데이트 {formatDateTime(template.updatedAt)}
                  </p>
                </div>
                <RowActions
                  basePath={basePath}
                  isDeleting={
                    deleteTemplateMutation.isPending &&
                    deleteTemplateMutation.variables === template.id
                  }
                  template={template}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
