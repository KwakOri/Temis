"use client";

import { Tables } from "@/types/supabase";

type Template = Tables<'templates'>;
type User = Tables<'users'>;
type TemplateAccess = Tables<'template_access'>;

interface TemplateAccessWithUser extends TemplateAccess {
  users?: User;
}
import { useEffect, useState } from "react";

export default function AccessManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateAccess, setTemplateAccess] = useState<
    TemplateAccessWithUser[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 새 권한 추가를 위한 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | "">("");
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<
    "read" | "write" | "admin"
  >("read");
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  useEffect(() => {
    fetchTemplates();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateAccess();
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/templates", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchTemplateAccess = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/template-access?templateId=${selectedTemplate}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();

        setTemplateAccess(data.accessList || []);
      } else {
        throw new Error("접근 권한 목록을 가져올 수 없습니다.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const grantAccess = async () => {
    if (!selectedTemplate || !selectedUser || !selectedAccessLevel) {
      setError("모든 필드를 선택해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/admin/template-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          templateId: selectedTemplate,
          userId: selectedUser,
          accessLevel: selectedAccessLevel,
        }),
      });

      if (response.ok) {
        setShowAddForm(false);
        setSelectedUser("");
        setSelectedAccessLevel("read");
        fetchTemplateAccess();
      } else {
        const data = await response.json();
        setError(data.error || "권한 부여 중 오류가 발생했습니다.");
      }
    } catch (error) {
      setError("권한 부여 중 오류가 발생했습니다.");
    }
  };

  const updateAccess = async (
    userId: number,
    newAccessLevel: "read" | "write" | "admin"
  ) => {
    try {
      const response = await fetch("/api/admin/template-access", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          templateId: selectedTemplate,
          userId,
          accessLevel: newAccessLevel,
        }),
      });

      if (response.ok) {
        fetchTemplateAccess();
      } else {
        const data = await response.json();
        setError(data.error || "권한 수정 중 오류가 발생했습니다.");
      }
    } catch (error) {
      setError("권한 수정 중 오류가 발생했습니다.");
    }
  };

  const revokeAccess = async (userId: number) => {
    if (!confirm("정말로 이 사용자의 접근 권한을 제거하시겠습니까?")) return;

    try {
      const response = await fetch(
        `/api/admin/template-access?templateId=${selectedTemplate}&userId=${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        fetchTemplateAccess();
      } else {
        const data = await response.json();
        setError(data.error || "권한 제거 중 오류가 발생했습니다.");
      }
    } catch (error) {
      setError("권한 제거 중 오류가 발생했습니다.");
    }
  };

  const getAccessLevelColor = (level: string | null) => {
    switch (level) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "write":
        return "bg-yellow-100 text-yellow-800";
      case "read":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAccessLevelText = (level: string | null) => {
    switch (level) {
      case "admin":
        return "관리자";
      case "write":
        return "편집";
      case "read":
        return "읽기";
      default:
        return level || "알 수 없음";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">접근 권한 관리</h2>
        <p className="text-gray-600">템플릿별 사용자 접근 권한을 관리하세요</p>
      </div>

      {/* Template Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">템플릿 선택</h3>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 템플릿이 없습니다.
          </div>
        ) : (
          <>
            {/* Search Bar */}
            {templates.length > 3 && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="템플릿 검색..."
                    value={templateSearchTerm}
                    onChange={(e) => setTemplateSearchTerm(e.target.value)}
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
                  {templateSearchTerm && (
                    <button
                      onClick={() => setTemplateSearchTerm("")}
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

            {(() => {
              const filteredTemplates = templates.filter(
                (template) =>
                  template.name
                    .toLowerCase()
                    .includes(templateSearchTerm.toLowerCase()) ||
                  (template.description &&
                    template.description
                      .toLowerCase()
                      .includes(templateSearchTerm.toLowerCase()))
              );

              if (filteredTemplates.length === 0 && templateSearchTerm) {
                return (
                  <div className="text-center py-8 text-gray-500">
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
                      &apos;{templateSearchTerm}&apos;에 대한 검색 결과가
                      없습니다.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedTemplate === template.id
                          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {template.name}
                          </h4>
                          {template.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center space-x-2">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                template.is_public
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {template.is_public ? "공개" : "비공개"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {template.created_at
                                ? new Date(
                                    template.created_at
                                  ).toLocaleDateString("ko-KR")
                                : "날짜 없음"}
                            </span>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedTemplate === template.id && (
                          <div className="ml-2 flex-shrink-0">
                            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* Selected Template Info */}
        {selectedTemplate && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-blue-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-blue-800">
                <strong>
                  {templates.find((t) => t.id === selectedTemplate)?.name}
                </strong>{" "}
                템플릿이 선택되었습니다.
              </span>
            </div>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <>
          {/* Add Access Form */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                접근 권한 추가
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                {showAddForm ? "취소" : "권한 추가"}
              </button>
            </div>

            {showAddForm && (
              <div className="space-y-6">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    사용자 선택
                  </label>
                  
                  {(() => {
                    const availableUsers = users.filter(
                      (user) =>
                        !templateAccess.some(
                          (access) => access.user_id === user.id
                        )
                    );

                    if (availableUsers.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
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
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                          </svg>
                          <p>권한을 부여할 수 있는 사용자가 없습니다.</p>
                          <p className="text-sm">모든 사용자가 이미 접근 권한을 가지고 있습니다.</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Search Bar for Users */}
                        {availableUsers.length > 3 && (
                          <div className="mb-4">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="사용자 검색 (이름 또는 이메일)..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
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
                              {userSearchTerm && (
                                <button
                                  onClick={() => setUserSearchTerm("")}
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

                        {(() => {
                          const filteredUsers = availableUsers.filter(
                            (user) =>
                              user.name
                                .toLowerCase()
                                .includes(userSearchTerm.toLowerCase()) ||
                              user.email
                                .toLowerCase()
                                .includes(userSearchTerm.toLowerCase())
                          );

                          if (filteredUsers.length === 0 && userSearchTerm) {
                            return (
                              <div className="text-center py-8 text-gray-500">
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
                                  &apos;{userSearchTerm}&apos;에 대한 검색 결과가
                                  없습니다.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {filteredUsers.map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => setSelectedUser(user.id)}
                                  className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                                    selectedUser === user.id
                                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    {/* User Avatar */}
                                    <div className="flex-shrink-0">
                                      <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                                        <span className="text-sm font-medium text-white">
                                          {user.name?.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {user.name}
                                      </p>
                                      <p className="text-sm text-gray-500 truncate">
                                        {user.email}
                                      </p>
                                      <div className="mt-1">
                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                          {user.created_at
                                            ? `가입일: ${new Date(user.created_at).toLocaleDateString("ko-KR")}`
                                            : "정보 없음"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    {selectedUser === user.id && (
                                      <div className="flex-shrink-0">
                                        <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                          <svg
                                            className="w-3 h-3 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>

                {/* Selected User Info */}
                {selectedUser && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-400 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-green-800">
                        <strong>
                          {users.find((u) => u.id === selectedUser)?.name}
                        </strong>{" "}
                        사용자가 선택되었습니다.
                      </span>
                    </div>
                  </div>
                )}

                {/* Access Level and Grant Button */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      권한 레벨
                    </label>
                    <select
                      value={selectedAccessLevel}
                      onChange={(e) =>
                        setSelectedAccessLevel(
                          e.target.value as "read" | "write" | "admin"
                        )
                      }
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    >
                      <option value="read">읽기</option>
                      <option value="write">편집</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={grantAccess}
                      disabled={!selectedUser}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      권한 부여
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Access List */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                현재 접근 권한 ({templateAccess.length}명)
              </h3>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        권한 레벨
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        부여일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templateAccess.map((access) => (
                        <tr key={access.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">
                                    {access.users?.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {access.users?.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {access.users?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccessLevelColor(
                                access.access_level
                              )}`}
                            >
                              {getAccessLevelText(access.access_level)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {access.granted_at
                              ? new Date(access.granted_at).toLocaleDateString(
                                  "ko-KR"
                                )
                              : "날짜 없음"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <select
                              value={access.access_level || "read"}
                              onChange={(e) =>
                                updateAccess(
                                  access.user_id,
                                  e.target.value as "read" | "write" | "admin"
                                )
                              }
                              className="text-sm border-gray-300 rounded px-2 py-1"
                            >
                              <option value="read">읽기</option>
                              <option value="write">편집</option>
                              <option value="admin">관리자</option>
                            </select>
                            <button
                              onClick={() => revokeAccess(access.user_id)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              제거
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {templateAccess.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  이 템플릿에 접근 권한이 부여된 사용자가 없습니다.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
          <button
            onClick={() => setError("")}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
