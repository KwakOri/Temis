"use client";

import { Template } from "@/types/supabase-types";
import { useEffect, useState } from "react";

interface CreateTemplateForm {
  name: string;
  description: string;
  thumbnail_url: string;
  is_public: boolean;
}

// ThumbnailFile 인터페이스 제거 (더 이상 사용하지 않음)

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState<CreateTemplateForm>({
    name: "",
    description: "",
    thumbnail_url: "",
    is_public: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/templates", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("템플릿 목록을 가져올 수 없습니다.");
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const togglePublicStatus = async (
    templateId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          is_public: !currentStatus,
        }),
      });

      if (response.ok) {
        await fetchTemplates(); // 새로고침
      }
    } catch (error) {
      console.error("Template update error:", error);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");

    try {
      // 먼저 템플릿을 생성 (thumbnail_url은 임시로 빈 값)
      const templateData = {
        ...formData,
        thumbnail_url: "", // 임시로 빈 값으로 설정
      };

      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(templateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "템플릿 생성에 실패했습니다.");
      }

      // 생성된 템플릿의 ID를 사용하여 thumbnail_url 업데이트
      const createdTemplate = data.template;
      const thumbnailUrl = `/thumbnail/${createdTemplate.id}.png`;

      // thumbnail_url 업데이트
      const updateResponse = await fetch(`/api/admin/templates/${createdTemplate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          thumbnail_url: thumbnailUrl,
        }),
      });

      if (!updateResponse.ok) {
        console.warn('썸네일 URL 업데이트 실패, 하지만 템플릿은 생성됨');
      }

      // 성공 시 모달 닫기 및 폼 초기화
      resetModal();

      // 템플릿 목록 새로고침
      await fetchTemplates();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">템플릿 관리</h2>
          <p className="text-gray-600">전체 템플릿을 조회하고 관리하세요</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 px-4 py-2 rounded-lg">
            <span className="text-indigo-800 font-semibold">
              총 {templates.length}개
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
          >
            + 템플릿 추가
          </button>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  템플릿
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {template.name}
                      </div>
                      {template.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        template.is_public
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {template.is_public ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(template.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() =>
                        togglePublicStatus(template.id, template.is_public)
                      }
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        template.is_public
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {template.is_public ? "비공개로 변경" : "공개로 변경"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">등록된 템플릿이 없습니다.</div>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">새 템플릿 추가</h3>
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

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  템플릿 이름 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="템플릿 이름을 입력하세요"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="템플릿 설명을 입력하세요"
                  maxLength={500}
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
                        템플릿 생성 후 <code className="bg-blue-100 px-1 rounded text-xs">/public/thumbnail/[template_id].png</code> 경로에 썸네일 이미지를 추가하면 자동으로 표시됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    공개 템플릿으로 설정
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
                  {createLoading ? "생성 중..." : "템플릿 생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
