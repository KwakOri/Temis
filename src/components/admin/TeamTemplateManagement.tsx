"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useAdminTeamTemplates,
  useAdminTeams,
  useConnectTeam,
  useCreateTeamTemplate,
  useDisconnectTeam,
} from "@/hooks/query/useAdminTeamTemplates";
import { TeamTemplateWithRelations } from "@/services/admin/teamTemplateService";
import { Database } from "@/types/supabase";
import { FileText, Paperclip } from "lucide-react";
import { useState } from "react";

type Team = Database["public"]["Tables"]["teams"]["Row"];

interface CreateTeamTemplateForm {
  name: string;
  descriptions: string;
}

const ITEMS_PER_PAGE = 20;

export default function TeamTemplateManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TeamTemplateWithRelations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<CreateTeamTemplateForm>({
    name: "",
    descriptions: "",
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // React Query hooks
  const {
    data: teamTemplatesData,
    isLoading: loading,
    error: teamTemplatesError,
  } = useAdminTeamTemplates({
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  });

  const { data: teams } = useAdminTeams();

  const createMutation = useCreateTeamTemplate();
  const connectMutation = useConnectTeam();
  const disconnectMutation = useDisconnectTeam();

  const teamTemplates = teamTemplatesData?.teamTemplates || [];
  const pagination = teamTemplatesData?.pagination;
  const totalPages = pagination
    ? Math.ceil(pagination.total / ITEMS_PER_PAGE)
    : 0;

  const error = teamTemplatesError
    ? (teamTemplatesError as Error).message
    : "";
  const createLoading = createMutation.isPending;
  const createError = createMutation.error
    ? (createMutation.error as Error).message
    : "";

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync(formData);
      resetModal();
    } catch (error) {
      // Error is handled by React Query mutation
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetModal = () => {
    setShowCreateModal(false);
    createMutation.reset();
    setFormData({
      name: "",
      descriptions: "",
    });
  };

  const handleGoToTemplate = (templateId: string) => {
    window.open(`/team-time-table/${templateId}`, "_blank");
  };

  const handleShowIdModal = (template: TeamTemplateWithRelations) => {
    // ID 복사
    navigator.clipboard.writeText(template.id);
    alert(`ID가 복사되었습니다: ${template.id}`);
  };

  const handleOpenConnectModal = (template: TeamTemplateWithRelations) => {
    setSelectedTemplate(template);
    setSelectedTeamId("");
    setShowConnectModal(true);
  };

  // 이미 다른 템플릿과 연결된 팀 제외한 팀 목록 (1:1 관계)
  const availableTeams = teams?.filter((team: Team) => {
    // 모든 템플릿의 연결된 팀 ID 수집
    const allConnectedTeamIds = teamTemplates.flatMap((template) =>
      template.relations_team_template_and_team?.map(
        (relation) => relation.team_id
      ) || []
    );
    // 어떤 템플릿과도 연결되지 않은 팀만 반환
    return !allConnectedTeamIds.includes(team.id);
  }) || [];

  const handleConnectTeam = async () => {
    if (!selectedTemplate || !selectedTeamId) return;

    try {
      await connectMutation.mutateAsync({
        teamTemplateId: selectedTemplate.id,
        data: { teamId: selectedTeamId },
      });
      setShowConnectModal(false);
      setSelectedTemplate(null);
      setSelectedTeamId("");
    } catch (error) {
      console.error("Team connection error:", error);
      alert(error instanceof Error ? error.message : "팀 연결에 실패했습니다.");
    }
  };

  const handleDisconnectTeam = async (
    template: TeamTemplateWithRelations,
    teamId: string
  ) => {
    if (!confirm("정말로 팀 연결을 해제하시겠습니까?")) return;

    try {
      await disconnectMutation.mutateAsync({
        teamTemplateId: template.id,
        teamId,
      });
    } catch (error) {
      console.error("Team disconnection error:", error);
      alert(
        error instanceof Error ? error.message : "팀 연결 해제에 실패했습니다."
      );
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      <AdminTabHeader
        title="팀 템플릿 관리"
        description="팀 시간표 템플릿을 조회하고 관리하세요"
        icon={FileText}
      >
        <div className="bg-quaternary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border">
          <span className="text-[#F4FDFF] font-semibold text-sm sm:text-base">
            총 {pagination?.total || 0}개
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-[#F4FDFF] px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base hover:bg-secondary transition-colors whitespace-nowrap"
        >
          + 템플릿 추가
        </button>
      </AdminTabHeader>

      {/* Templates List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  템플릿
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연결 상태
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
              {teamTemplates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      등록된 팀 템플릿이 없습니다.
                    </div>
                  </td>
                </tr>
              ) : (
                teamTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                        </div>
                        {template.descriptions && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {template.descriptions}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.isConnected ? (
                        <div className="flex flex-wrap gap-2">
                          {template.relations_team_template_and_team?.map(
                            (relation) =>
                              relation.teams && (
                                <div
                                  key={relation.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200"
                                >
                                  <Paperclip className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-medium text-green-700">
                                    {relation.teams.name}
                                  </span>
                                </div>
                              )
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          연결되지 않음
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleGoToTemplate(template.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                          title="새 탭에서 템플릿 열기"
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
                          템플릿 열기
                        </button>
                        <button
                          onClick={() => handleShowIdModal(template)}
                          className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          ID 복사
                        </button>
                        {!template.isConnected ? (
                          <button
                            onClick={() => handleOpenConnectModal(template)}
                            className="px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            팀 연결
                          </button>
                        ) : (
                          template.relations_team_template_and_team?.map(
                            (relation) =>
                              relation.teams && (
                                <button
                                  key={relation.id}
                                  onClick={() =>
                                    handleDisconnectTeam(
                                      template,
                                      relation.team_id
                                    )
                                  }
                                  className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  연결 해제
                                </button>
                              )
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden divide-y divide-gray-200">
          {teamTemplates.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-gray-500 text-sm">
                등록된 팀 템플릿이 없습니다.
              </p>
            </div>
          ) : (
            teamTemplates.map((template) => (
              <div key={template.id} className="p-4">
                <div className="space-y-3">
                  {/* 템플릿 이름 */}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {template.name}
                    </div>
                    {template.descriptions && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {template.descriptions}
                      </div>
                    )}
                  </div>

                  {/* 연결 상태 및 생성일 */}
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      {template.isConnected ? (
                        <div className="flex flex-wrap gap-1.5">
                          {template.relations_team_template_and_team?.map(
                            (relation) =>
                              relation.teams && (
                                <div
                                  key={relation.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200"
                                >
                                  <Paperclip className="w-2.5 h-2.5 text-green-600" />
                                  <span className="text-xs font-medium text-green-700">
                                    {relation.teams.name}
                                  </span>
                                </div>
                              )
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          연결되지 않음
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {new Date(template.created_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </div>
                  </div>

                  {/* 버튼들 */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleGoToTemplate(template.id)}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                    >
                      템플릿 열기
                    </button>
                    <button
                      onClick={() => handleShowIdModal(template)}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      ID 복사
                    </button>
                    {!template.isConnected ? (
                      <button
                        onClick={() => handleOpenConnectModal(template)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      >
                        팀 연결
                      </button>
                    ) : (
                      template.relations_team_template_and_team?.map(
                        (relation) =>
                          relation.teams && (
                            <button
                              key={relation.id}
                              onClick={() =>
                                handleDisconnectTeam(
                                  template,
                                  relation.team_id
                                )
                              }
                              className="px-3 py-1.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              연결 해제
                            </button>
                          )
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
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
                      {Math.min(
                        (currentPage - 1) * ITEMS_PER_PAGE + 1,
                        pagination?.total || 0
                      )}
                    </span>{" "}
                    -{" "}
                    <span className="font-medium">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        pagination?.total || 0
                      )}
                    </span>{" "}
                    표시
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">이전</span>
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        );
                      })
                      .map((page) => (
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
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">새 팀 템플릿 추가</h3>
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
                  name="descriptions"
                  value={formData.descriptions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="템플릿 설명을 입력하세요"
                  maxLength={500}
                />
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

      {/* Connect Team Modal */}
      {showConnectModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">팀 연결</h3>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedTemplate(null);
                  setSelectedTeamId("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900">
                {selectedTemplate.name}
              </h4>
              {selectedTemplate.descriptions && (
                <p className="text-sm text-slate-600">
                  {selectedTemplate.descriptions}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  연결할 팀 선택 *
                </label>

                {availableTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm">연결 가능한 팀이 없습니다.</p>
                    <p className="text-xs mt-1">모든 팀이 이미 연결되었습니다.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                    {availableTeams.map((team: Team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setSelectedTeamId(team.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          selectedTeamId === team.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {team.name}
                            </div>
                            {team.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {team.description}
                              </div>
                            )}
                          </div>
                          {selectedTeamId === team.id && (
                            <div className="ml-3 flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-indigo-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectModal(false);
                    setSelectedTemplate(null);
                    setSelectedTeamId("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={connectMutation.isPending}
                >
                  취소
                </button>
                <button
                  onClick={handleConnectTeam}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={connectMutation.isPending || !selectedTeamId || availableTeams.length === 0}
                >
                  {connectMutation.isPending ? "연결 중..." : "팀 연결"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
