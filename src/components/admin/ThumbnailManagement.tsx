"use client";

import { AdminThumbnailService } from "@/services/admin/thumbnailService";
import type { Thumbnail } from "@/types/admin";
import { ExternalLink, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CreateThumbnailForm {
  name: string;
  description: string;
  thumbnail_url: string;
  is_public: boolean;
}

type ThumbnailTab = "all" | "public" | "private";

const ITEMS_PER_PAGE = 20;

export default function ThumbnailManagement() {
  const [activeTab, setActiveTab] = useState<ThumbnailTab>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    limit: number;
    offset: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ID 모달 관련 상태
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedThumbnailForId, setSelectedThumbnailForId] =
    useState<Thumbnail | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [formData, setFormData] = useState<CreateThumbnailForm>({
    name: "",
    description: "",
    thumbnail_url: "",
    is_public: false,
  });

  // 썸네일 목록 불러오기
  const fetchThumbnails = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await AdminThumbnailService.getThumbnails({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      });
      setThumbnails(response.thumbnails);
      setPagination(response.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThumbnails();
  }, [currentPage]);

  // 필터링된 썸네일 목록 with search
  const filteredThumbnails = useMemo(() => {
    let filtered = thumbnails;

    // 탭에 따른 필터링
    switch (activeTab) {
      case "public":
        filtered = thumbnails.filter((thumbnail) => thumbnail.is_public);
        break;
      case "private":
        filtered = thumbnails.filter((thumbnail) => !thumbnail.is_public);
        break;
      case "all":
      default:
        filtered = thumbnails;
        break;
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        (thumbnail) =>
          thumbnail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (thumbnail.description &&
            thumbnail.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [thumbnails, activeTab, searchTerm]);

  // 탭별 통계 (전체 개수 기준)
  const tabCounts = useMemo(() => {
    return {
      all: pagination?.total || 0,
      public: thumbnails.filter((thumbnail) => thumbnail.is_public).length,
      private: thumbnails.filter((thumbnail) => !thumbnail.is_public).length,
    };
  }, [thumbnails, pagination]);

  // 새 썸네일 생성
  const handleCreateThumbnail = async () => {
    if (!formData.name.trim()) {
      setCreateError("썸네일 이름을 입력해주세요.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    try {
      await AdminThumbnailService.createThumbnail(formData);
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        thumbnail_url: "",
        is_public: false,
      });
      fetchThumbnails(); // 목록 새로고침
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  // 공개 여부 토글
  const handleTogglePublic = async (thumbnailId: string, isPublic: boolean) => {
    try {
      await AdminThumbnailService.updateThumbnail(thumbnailId, {
        is_public: !isPublic,
      });
      fetchThumbnails(); // 목록 새로고침
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // 썸네일 삭제
  const handleDeleteThumbnail = async (thumbnailId: string) => {
    if (!confirm("정말 이 썸네일을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await AdminThumbnailService.deleteThumbnail(thumbnailId);
      fetchThumbnails(); // 목록 새로고침
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / ITEMS_PER_PAGE)
    : 0;

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 탭 변경 시 페이지 초기화
  const handleTabChange = (tab: ThumbnailTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const resetModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setFormData({
      name: "",
      description: "",
      thumbnail_url: "",
      is_public: false,
    });
  };

  const handleShowThumbnailId = (thumbnail: Thumbnail) => {
    setSelectedThumbnailForId(thumbnail);
    setShowIdModal(true);
  };

  const handleCopyThumbnailId = async () => {
    if (selectedThumbnailForId) {
      try {
        await navigator.clipboard.writeText(selectedThumbnailForId.id);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error("복사 실패:", error);
      }
    }
  };

  const handleCloseIdModal = () => {
    setShowIdModal(false);
    setSelectedThumbnailForId(null);
    setCopySuccess(false);
  };

  const handleGoToThumbnail = (thumbnailId: string) => {
    window.open(`/thumbnails/${thumbnailId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary">썸네일 관리</h2>
          <p className="text-xs sm:text-sm text-secondary">전체 썸네일을 조회하고 관리하세요</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-quaternary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border">
            <span className="text-[#F4FDFF] font-semibold text-sm sm:text-base">
              총 {thumbnails.length}개
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-[#F4FDFF] px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base hover:bg-secondary transition-colors whitespace-nowrap"
          >
            + 썸네일 추가
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 sm:justify-center overflow-x-auto">
              <button
                onClick={() => handleTabChange("all")}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "all"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                전체 썸네일
                <span className="ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {tabCounts.all}
                </span>
              </button>
              <button
                onClick={() => handleTabChange("public")}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "public"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                공개 썸네일
                <span className="ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-green-100 text-green-600">
                  {tabCounts.public}
                </span>
              </button>
              <button
                onClick={() => handleTabChange("private")}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "private"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                비공개 썸네일
                <span className="ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {tabCounts.private}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {thumbnails.length > 3 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="썸네일 검색 (이름 또는 설명)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thumbnails List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  썸네일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                if (
                  filteredThumbnails.length === 0 &&
                  (searchTerm || activeTab !== "all")
                ) {
                  return (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <p>
                            {searchTerm ? (
                              <>
                                &apos;{searchTerm}&apos;에 대한 검색 결과가
                                없습니다.
                              </>
                            ) : activeTab === "public" ? (
                              "공개 썸네일이 없습니다."
                            ) : activeTab === "private" ? (
                              "비공개 썸네일이 없습니다."
                            ) : (
                              "썸네일이 없습니다."
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filteredThumbnails.map((thumbnail) => (
                  <tr key={thumbnail.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {thumbnail.name}
                        </div>
                        {thumbnail.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {thumbnail.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          thumbnail.is_public
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {thumbnail.is_public ? "공개" : "비공개"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(thumbnail.created_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleGoToThumbnail(thumbnail.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                          title="새 탭에서 썸네일 열기"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          썸네일 열기
                        </button>
                        <button
                          onClick={() => handleShowThumbnailId(thumbnail)}
                          className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          ID 보기
                        </button>
                        <button
                          onClick={() =>
                            handleTogglePublic(thumbnail.id, thumbnail.is_public)
                          }
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            thumbnail.is_public
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          } transition-colors`}
                        >
                          {thumbnail.is_public ? "비공개로 변경" : "공개로 변경"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {thumbnails.length === 0 && !searchTerm && activeTab === "all" && (
          <div className="text-center py-12">
            <div className="text-gray-500">등록된 썸네일이 없습니다.</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-6 py-4 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  전체 <span className="font-medium">{pagination?.total || 0}</span>개 중{" "}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination?.total || 0)}
                  </span>{" "}
                  -{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * ITEMS_PER_PAGE, pagination?.total || 0)}
                  </span>{" "}
                  표시
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">이전</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* 페이지 번호 버튼들 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      );
                    })
                    .map((page, index, array) => {
                      if (index > 0 && page - array[index - 1] > 1) {
                        return (
                          <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })
                    .filter(Boolean)}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      );
                    })
                    .map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">다음</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">새 썸네일 추가</h3>
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="text-red-800 text-sm">{createError}</div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleCreateThumbnail(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  썸네일 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="썸네일 이름을 입력하세요"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  간단 설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="썸네일 간단 설명을 입력하세요 (목록에 표시됨)"
                  maxLength={200}
                />
              </div>

              {/* 썸네일 정보 섹션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  썸네일 이미지
                </label>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium mb-1">
                        썸네일 자동 설정
                      </p>
                      <p className="text-blue-700">
                        썸네일 생성 후 사용자가 직접 이미지를 업로드하여 설정할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) =>
                      setFormData({ ...formData, is_public: e.target.checked })
                    }
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    공개 썸네일로 설정
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={createLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createLoading}
                >
                  {createLoading ? "생성 중..." : "썸네일 생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thumbnail ID Modal */}
      {showIdModal && selectedThumbnailForId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">썸네일 ID</h3>
              <button
                onClick={handleCloseIdModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Thumbnail Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">썸네일 이름</div>
                <div className="font-medium text-gray-900">
                  {selectedThumbnailForId.name}
                </div>
                {selectedThumbnailForId.description && (
                  <>
                    <div className="text-sm text-gray-600 mt-3 mb-1">설명</div>
                    <div className="text-sm text-gray-700">
                      {selectedThumbnailForId.description}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  썸네일 ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedThumbnailForId.id}
                    readOnly
                    className="block w-full pr-10 py-2 px-3 border border-gray-300 bg-gray-50 rounded-md text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyThumbnailId}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {copySuccess ? (
                      <svg
                        className="h-5 w-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {copySuccess && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    클립보드에 복사되었습니다!
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm">
                    <p className="text-blue-800 font-medium mb-1">
                      썸네일 ID 사용법
                    </p>
                    <p className="text-blue-700">
                      이 ID를 사용하여 API 호출이나 직접 썸네일 참조가
                      가능합니다. 개발자에게 전달하거나 시스템 연동 시
                      사용하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleGoToThumbnail(selectedThumbnailForId.id)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                썸네일 열기
              </button>
              <button
                onClick={handleCopyThumbnailId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                ID 복사
              </button>
              <button
                onClick={handleCloseIdModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
