"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Template } from "@/types/supabase-types";
import { useEffect, useState } from "react";

interface UserTemplate {
  id: string | number;
  access_level: 'read' | 'write' | 'admin';
  granted_at: string | null;
  templates: Template;
}

const MyPage = () => {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserTemplates();
  }, []);

  const fetchUserTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/templates', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('템플릿 목록을 가져올 수 없습니다.');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelText = (level: string) => {
    switch (level) {
      case 'admin':
        return '관리자';
      case 'write':
        return '편집';
      case 'read':
        return '읽기';
      default:
        return level;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'write':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'read':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleTemplateClick = (template: Template) => {
    // TODO: 템플릿 상세 페이지로 이동 또는 템플릿 사용 페이지로 이동
    console.log('Navigate to template:', template.id);
    // 예시: router.push(`/templates/${template.id}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
            <p className="mt-2 text-gray-600">
              접근 권한이 있는 템플릿 목록을 확인하고 관리하세요.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">{error}</div>
              <button
                onClick={() => setError('')}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                닫기
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">접근 가능한 템플릿</p>
                      <p className="text-2xl font-semibold text-gray-900">{templates.length}개</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Templates Grid */}
              {templates.length === 0 ? (
                <div className="text-center py-20">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">템플릿이 없습니다</h3>
                  <p className="mt-2 text-gray-500">
                    아직 접근 권한이 부여된 템플릿이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {templates.map((template) => (
                    <div
                      key={`${template.templates.id}-${template.id}`}
                      onClick={() => handleTemplateClick(template.templates)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    >
                      {/* Template Thumbnail */}
                      <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                        {template.templates.thumbnail_url ? (
                          <img
                            src={template.templates.thumbnail_url}
                            alt={template.templates.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Template Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {template.templates.name}
                          </h3>
                          <span
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getAccessLevelColor(template.access_level)}`}
                          >
                            {getAccessLevelText(template.access_level)}
                          </span>
                        </div>

                        {template.templates.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {template.templates.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                template.templates.is_public
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {template.templates.is_public ? '공개' : '비공개'}
                            </span>
                          </div>
                          {template.granted_at && (
                            <span>
                              권한 부여: {new Date(template.granted_at).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MyPage;
