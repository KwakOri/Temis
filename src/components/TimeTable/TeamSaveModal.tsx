import {
  useSaveTeamScheduleFromDynamicCards,
  useUserTeams,
  useUserTeamSchedule,
} from "@/hooks/useTeam";
import { TeamService } from "@/services/teamService";
import { TDefaultCard } from "@/types/time-table/data";
import React, { useState, useMemo } from "react";

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

  // 현재 주차와 다음 주차 날짜 계산
  const weekDates = useMemo(() => {
    const currentWeekStart = TeamService.getWeekStartDateFromString(mondayDateStr);
    const nextWeekDate = new Date(currentWeekStart);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStart = nextWeekDate.toISOString().split("T")[0];

    return {
      currentWeek: currentWeekStart,
      nextWeek: nextWeekStart,
    };
  }, [mondayDateStr]);

  // 선택된 팀의 현재 주차 저장 상태 확인
  const { data: currentWeekSchedule } = useUserTeamSchedule(
    selectedTeamId,
    weekDates.currentWeek
  );

  // 선택된 팀의 다음 주차 저장 상태 확인
  const { data: nextWeekSchedule } = useUserTeamSchedule(
    selectedTeamId,
    weekDates.nextWeek
  );

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
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedTeamId === team.id
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    } ${isLoading || saveTeamScheduleMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!isLoading && !saveTeamScheduleMutation.isPending) {
                        setSelectedTeamId(team.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedTeamId === team.id
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedTeamId === team.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{team.name}</h3>
                          {team.description && (
                            <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                          )}
                        </div>
                      </div>
                      {selectedTeamId === team.id && (
                        <div className="text-blue-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-600 text-sm py-2">
                속한 팀이 없습니다. 팀에 가입한 후 다시 시도해 주세요.
              </div>
            )}
          </div>

          {/* 주차별 저장 상태 표시 */}
          {selectedTeamId && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">저장 상태</div>
              <div className="space-y-2">
                {/* 현재 주차 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      이번 주 ({weekDates.currentWeek})
                    </p>
                    <p className="text-xs text-gray-500">현재 주차</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentWeekSchedule ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600 font-medium">저장됨</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-500">미저장</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 다음 주차 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      다음 주 ({weekDates.nextWeek})
                    </p>
                    <p className="text-xs text-gray-500">다음 주차</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {nextWeekSchedule ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600 font-medium">저장됨</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-500">미저장</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 현재 저장하려는 주차 표시 */}
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-md">
                💾 현재 저장하려는 주차: {weekDates.currentWeek}
                {currentWeekSchedule && (
                  <span className="text-amber-600"> (기존 데이터를 덮어씁니다)</span>
                )}
              </div>
            </div>
          )}

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
