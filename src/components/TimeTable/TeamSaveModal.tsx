import {
  useSaveTeamScheduleFromDynamicCards,
  useUserTeams,
} from "@/hooks/useTeam";
import { TeamService } from "@/services/teamService";
import { TDefaultCard } from "@/types/time-table/data";
import React, { useState } from "react";

interface TeamSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mondayDateStr: string;
  scheduleData: TDefaultCard[];
}

const TeamSaveModal: React.FC<TeamSaveModalProps> = ({
  isOpen,
  onClose,
  mondayDateStr,
  scheduleData,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: teams,
    isLoading: teamsLoading,
    error: teamsError,
  } = useUserTeams();
  const saveTeamScheduleMutation = useSaveTeamScheduleFromDynamicCards();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeamId) {
      alert("팀을 선택해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const weekStartDate =
        TeamService.getWeekStartDateFromString(mondayDateStr);

      await saveTeamScheduleMutation.mutateAsync({
        teamId: selectedTeamId,
        weekStartDate,
        dynamicCards: scheduleData,
      });

      alert("팀 시간표가 성공적으로 저장되었습니다.");
      onClose();
    } catch (error) {
      console.error("팀 시간표 저장 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "팀 시간표 저장에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading || saveTeamScheduleMutation.isPending) return;
    setSelectedTeamId("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">팀 시간표 저장</h2>
          <button
            onClick={handleClose}
            disabled={isLoading || saveTeamScheduleMutation.isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="team-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              저장할 팀 선택
            </label>

            {teamsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">
                  팀 목록을 불러오는 중...
                </span>
              </div>
            ) : teamsError ? (
              <div className="text-red-600 text-sm py-2">
                팀 목록을 불러오는데 실패했습니다.
              </div>
            ) : teams && teams.length > 0 ? (
              <select
                id="team-select"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={isLoading || saveTeamScheduleMutation.isPending}
              >
                <option value="">팀을 선택해 주세요</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-gray-600 text-sm py-2">
                속한 팀이 없습니다. 팀에 가입한 후 다시 시도해 주세요.
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p className="font-medium mb-1">저장 정보</p>
            <p>• 주차: {mondayDateStr} 주</p>
            <p>• 저장 내용: 시간과 제목 정보만 저장됩니다</p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading || saveTeamScheduleMutation.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                saveTeamScheduleMutation.isPending ||
                !selectedTeamId ||
                !teams ||
                teams.length === 0
              }
              className="flex-1 px-4 py-2 bg-[#3E4A82] text-white rounded-md hover:bg-[#2b2f4d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading || saveTeamScheduleMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamSaveModal;
