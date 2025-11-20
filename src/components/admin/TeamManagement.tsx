"use client";

import {
  useAddTeamMember,
  useAllTeams,
  useCreateTeam,
  useDeleteTeam,
  useRemoveTeamMember,
  useUpdateMemberRole,
  useUpdateTeam,
  useUserSearch,
} from "@/hooks/query/useTeamManagement";
import { Tables } from "@/types/supabase";
import { TeamWithMembers } from "@/types/team-timetable";
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

// 모달을 위한 enum
enum ModalType {
  NONE = "none",
  CREATE_TEAM = "create_team",
  EDIT_TEAM = "edit_team",
  MANAGE_MEMBERS = "manage_members",
  DELETE_TEAM = "delete_team",
}

// 팀원 역할 enum
enum MemberRole {
  MANAGER = "manager",
  MEMBER = "member",
}

interface TeamFormData {
  name: string;
  description?: string;
}

interface MemberFormData {
  email: string;
  role: MemberRole;
  selectedUser?: Tables<"users">;
}

const TeamManagement = () => {
  // State
  const [activeModal, setActiveModal] = useState<ModalType>(ModalType.NONE);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFormData, setTeamFormData] = useState<TeamFormData>({
    name: "",
    description: "",
  });
  const [memberFormData, setMemberFormData] = useState<MemberFormData>({
    email: "",
    role: MemberRole.MEMBER,
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // React Query hooks
  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
  } = useAllTeams();

  const { data: searchedUsers = [], isLoading: usersLoading } = useUserSearch(
    userSearchQuery,
    userSearchQuery.length >= 2
  );

  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addMemberMutation = useAddTeamMember();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveTeamMember();

  // Handlers
  const handleCreateTeam = () => {
    setTeamFormData({ name: "", description: "" });
    setActiveModal(ModalType.CREATE_TEAM);
  };

  const handleEditTeam = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setTeamFormData({
      name: team.name,
      description: team.description || "",
    });
    setActiveModal(ModalType.EDIT_TEAM);
  };

  const handleManageMembers = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setMemberFormData({ email: "", role: MemberRole.MEMBER });
    setActiveModal(ModalType.MANAGE_MEMBERS);
  };

  const handleDeleteTeamClick = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setActiveModal(ModalType.DELETE_TEAM);
  };

  const closeModal = () => {
    setActiveModal(ModalType.NONE);
    setSelectedTeam(null);
    setTeamFormData({ name: "", description: "" });
    setMemberFormData({ email: "", role: MemberRole.MEMBER });
    setUserSearchQuery("");
  };

  // Submit handlers
  const handleSubmitTeam = async () => {
    if (!teamFormData.name.trim()) return;

    try {
      if (activeModal === ModalType.CREATE_TEAM) {
        await createTeamMutation.mutateAsync({
          name: teamFormData.name.trim(),
          description: teamFormData.description?.trim() || undefined,
        });
      } else if (activeModal === ModalType.EDIT_TEAM && selectedTeam) {
        await updateTeamMutation.mutateAsync({
          teamId: selectedTeam.id,
          data: {
            name: teamFormData.name.trim(),
            description: teamFormData.description?.trim() || undefined,
          },
        });
      }
      closeModal();
    } catch (error) {
      console.error("Team operation failed:", error);
      // TODO: Show error toast
    }
  };

  const handleAddMember = async () => {
    if (!memberFormData.selectedUser || !selectedTeam) return;

    try {
      await addMemberMutation.mutateAsync({
        teamId: selectedTeam.id,
        data: {
          user_id: memberFormData.selectedUser.id,
          role: memberFormData.role,
        },
      });
      setMemberFormData({ email: "", role: MemberRole.MEMBER });
      setUserSearchQuery("");
    } catch (error) {
      console.error("Add member failed:", error);
      // TODO: Show error toast
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;

    try {
      await removeMemberMutation.mutateAsync({
        teamId: selectedTeam.id,
        memberId,
      });
    } catch (error) {
      console.error("Remove member failed:", error);
      // TODO: Show error toast
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!selectedTeam) return;

    try {
      await updateMemberRoleMutation.mutateAsync({
        teamId: selectedTeam.id,
        memberId,
        data: { role: newRole as "manager" | "member" },
      });
    } catch (error) {
      console.error("Update member role failed:", error);
      // TODO: Show error toast
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;

    try {
      await deleteTeamMutation.mutateAsync(selectedTeam.id);
      closeModal();
    } catch (error) {
      console.error("Delete team failed:", error);
      // TODO: Show error toast
    }
  };

  const handleUserSelect = (user: Tables<"users">) => {
    setMemberFormData({
      ...memberFormData,
      email: user.email || "",
      selectedUser: user,
    });
    setUserSearchQuery("");
  };

  // Filtered teams with loading and error handling
  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);

  // Loading state
  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">팀 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (teamsError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Users className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg font-medium">팀 목록을 불러올 수 없습니다</p>
          <p className="text-sm text-gray-500 mt-1">
            {teamsError instanceof Error
              ? teamsError.message
              : "알 수 없는 오류가 발생했습니다"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">팀 관리</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">팀을 생성하고 팀원을 관리하세요</p>
        </div>
        <button
          onClick={handleCreateTeam}
          className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm sm:text-base whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />팀 생성
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="팀 이름 또는 설명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  <p className="text-sm text-gray-500">
                    {team.memberCount || 0}명의 팀원
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEditTeam(team)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="팀 정보 수정"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleManageMembers(team)}
                  className="p-1 text-gray-400 hover:text-primary transition-colors"
                  title="팀원 관리"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTeamClick(team)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="팀 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {team.description && (
              <p className="text-gray-600 text-sm mb-4">{team.description}</p>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">팀원</h4>
              {team.members && team.members.length > 0 ? (
                <div className="space-y-1">
                  {team.members.slice(0, 3).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">
                          {member.users?.name || "이름 없음"}
                        </span>
                        {member.role === "manager" && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            매니저
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {team.members.length > 3 && (
                    <p className="text-xs text-gray-500">
                      외 {team.members.length - 3}명
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">팀원이 없습니다</p>
              )}
            </div>

            <button
              onClick={() => handleManageMembers(team)}
              className="w-full mt-4 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              팀원 관리
            </button>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "검색 결과가 없습니다" : "팀이 없습니다"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? "다른 검색어로 시도해보세요"
              : "첫 번째 팀을 생성해보세요"}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreateTeam}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />팀 생성
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {activeModal !== ModalType.NONE && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Create/Edit Team Modal */}
            {(activeModal === ModalType.CREATE_TEAM ||
              activeModal === ModalType.EDIT_TEAM) && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {activeModal === ModalType.CREATE_TEAM
                    ? "팀 생성"
                    : "팀 정보 수정"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      팀 이름 *
                    </label>
                    <input
                      type="text"
                      value={teamFormData.name}
                      onChange={(e) =>
                        setTeamFormData({
                          ...teamFormData,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="팀 이름을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      팀 설명
                    </label>
                    <textarea
                      value={teamFormData.description}
                      onChange={(e) =>
                        setTeamFormData({
                          ...teamFormData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="팀에 대한 간단한 설명을 입력하세요"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmitTeam}
                    disabled={
                      !teamFormData.name.trim() ||
                      createTeamMutation.isPending ||
                      updateTeamMutation.isPending
                    }
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {createTeamMutation.isPending ||
                    updateTeamMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {activeModal === ModalType.CREATE_TEAM
                          ? "생성 중..."
                          : "수정 중..."}
                      </>
                    ) : activeModal === ModalType.CREATE_TEAM ? (
                      "생성"
                    ) : (
                      "수정"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Manage Members Modal */}
            {activeModal === ModalType.MANAGE_MEMBERS && selectedTeam && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  팀원 관리 - {selectedTeam.name}
                </h3>

                {/* Add Member Form */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    새 팀원 추가
                  </h4>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="사용자 이름 또는 이메일로 검색..."
                      />
                      {userSearchQuery.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                          {usersLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              검색 중...
                            </div>
                          ) : searchedUsers.length > 0 ? (
                            searchedUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium">{user.name}</div>
                                <div className="text-gray-500">
                                  {user.email}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              검색 결과가 없습니다
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {memberFormData.selectedUser && (
                      <div className="p-2 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm font-medium">
                          {memberFormData.selectedUser.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {memberFormData.selectedUser.email}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value={MemberRole.MEMBER}
                          checked={memberFormData.role === MemberRole.MEMBER}
                          onChange={(e) =>
                            setMemberFormData({
                              ...memberFormData,
                              role: e.target.value as MemberRole,
                            })
                          }
                          className="mr-2"
                        />
                        팀원
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value={MemberRole.MANAGER}
                          checked={memberFormData.role === MemberRole.MANAGER}
                          onChange={(e) =>
                            setMemberFormData({
                              ...memberFormData,
                              role: e.target.value as MemberRole,
                            })
                          }
                          className="mr-2"
                        />
                        매니저
                      </label>
                    </div>
                    <button
                      onClick={handleAddMember}
                      disabled={
                        !memberFormData.selectedUser ||
                        addMemberMutation.isPending
                      }
                      className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {addMemberMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          추가 중...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          팀원 추가
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Current Members */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    현재 팀원
                  </h4>
                  {selectedTeam.members && selectedTeam.members.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTeam.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <UserCheck className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.users?.name || "이름 없음"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.users?.email || "이메일 없음"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <select
                              value={member.role as string}
                              onChange={(e) =>
                                handleUpdateMemberRole(
                                  member.id,
                                  e.target.value
                                )
                              }
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="member">팀원</option>
                              <option value="manager">매니저</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="팀원 제거"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      팀원이 없습니다
                    </p>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}

            {/* Delete Team Modal */}
            {activeModal === ModalType.DELETE_TEAM && selectedTeam && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  팀 삭제
                </h3>
                <p className="text-gray-600 mb-6">
                  정말로 &apos;<strong>{selectedTeam.name}</strong>&apos; 팀을
                  삭제하시겠습니까?
                  <br />이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteTeam}
                    disabled={deleteTeamMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {deleteTeamMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        삭제 중...
                      </>
                    ) : (
                      "삭제"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
