"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useDeleteTemplateStudioTemplate,
  useDuplicateTemplateStudioTemplate,
  useTemplateStudioTemplates,
} from "@/hooks/query/useTemplateStudio";
import { cn } from "@/lib/utils";
import type { TemplateStudioTemplateRecord } from "@/services/server/templateStudioPersistenceService";
import type { StudioTemplateKind } from "@/types/template-studio";
import {
  ArrowUpRight,
  Copy,
  Edit,
  Eye,
  Image as ImageIcon,
  LayoutTemplate,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const ThumbnailCoverStatus = ({
  template,
}: {
  template: TemplateStudioTemplateRecord;
}) => (
  <div className="mt-2 flex items-center gap-2">
    <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
      {template.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Catalog covers are stored URLs from the templates table.
        <img
          src={template.thumbnailUrl}
          alt="대표 이미지"
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className="h-4 w-4 text-gray-300" aria-hidden="true" />
      )}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-gray-500">
        {template.thumbnailUrl ? "대표 이미지 등록됨" : "대표 이미지 없음"}
      </p>
      <Link
        className="text-[11px] font-semibold text-blue-600 hover:underline"
        href={"/admin/template-products/" + template.id}
      >
        {template.thumbnailUrl ? "대표 이미지 관리" : "대표 이미지 등록"}
      </Link>
    </div>
  </div>
);

const RowActions = ({
  template,
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
  basePath,
  showDuplicate,
}: {
  template: TemplateStudioTemplateRecord;
  onDelete: (template: TemplateStudioTemplateRecord) => void;
  onDuplicate: (template: TemplateStudioTemplateRecord) => void;
  isDeleting: boolean;
  isDuplicating: boolean;
  basePath: string;
  showDuplicate: boolean;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
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
      <div className="relative" ref={menuRef}>
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label={`${template.name} 작업 메뉴`}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="작업 메뉴"
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {isMenuOpen ? (
          <div
            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
            role="menu"
          >
            <Link
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
              href={`${basePath}/${template.id}/edit`}
              role="menuitem"
              target="_blank"
              onClick={() => setIsMenuOpen(false)}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />새 탭에서 열기
            </Link>
            {showDuplicate ? (
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDuplicating}
                role="menuitem"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDuplicate(template);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {isDuplicating ? "복제 중..." : "복제"}
              </button>
            ) : null}
            <div className="my-1 border-t border-gray-100" />
            <button
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDeleting || isDuplicating}
              role="menuitem"
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onDelete(template);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

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
  const router = useRouter();
  const templatesQuery = useTemplateStudioTemplates(templateKind);
  const deleteTemplateMutation = useDeleteTemplateStudioTemplate();
  const duplicateTemplateMutation = useDuplicateTemplateStudioTemplate();
  const templates = templatesQuery.data?.templates ?? [];

  const handleDelete = (template: TemplateStudioTemplateRecord) => {
    if (
      !confirm(
        `"${template.name}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    deleteTemplateMutation.mutate(template.id, {
      onError: (error) => {
        window.alert(
          error instanceof Error
            ? error.message
            : "템플릿 삭제에 실패했습니다.",
        );
      },
    });
  };

  const handleDuplicate = (template: TemplateStudioTemplateRecord) => {
    duplicateTemplateMutation.mutate(template.id, {
      onSuccess: (response) => {
        router.push(`${basePath}/${response.template.id}/edit`);
      },
      onError: (error) => {
        window.alert(
          error instanceof Error
            ? error.message
            : "템플릿 복제에 실패했습니다.",
        );
      },
    });
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
                        {isThumbnail ? (
                          <ThumbnailCoverStatus template={template} />
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
                        isDuplicating={
                          duplicateTemplateMutation.isPending &&
                          duplicateTemplateMutation.variables === template.id
                        }
                        showDuplicate={isThumbnail}
                        template={template}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
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
                  {isThumbnail ? (
                    <ThumbnailCoverStatus template={template} />
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
                  isDuplicating={
                    duplicateTemplateMutation.isPending &&
                    duplicateTemplateMutation.variables === template.id
                  }
                  showDuplicate={isThumbnail}
                  template={template}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
