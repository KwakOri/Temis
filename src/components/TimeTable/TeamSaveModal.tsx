import {
  useSaveTeamSchedule,
  useUserTeams,
} from "@/hooks/query/useTeamSchedule";

import { useAuth } from "@/contexts/AuthContext";
import { useTimeTable } from "@/contexts/TimeTableContext";
import { Json } from "@/types/supabase";
import { useState } from "react";

interface TeamSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (teamId: string) => void;
}

const TeamSaveModal = ({ isOpen, onClose, onSuccess }: TeamSaveModalProps) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const { user } = useAuth();
  const { state } = useTimeTable();
  const { data: teams = [], isLoading: teamsLoading } = useUserTeams();
  const saveTeamSchedule = useSaveTeamSchedule();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selectedTeamId) {
      alert("팀을 선택해 주세요.");
      return;
    }

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      // 현재 시간표 데이터 준비
      const scheduleData: Json = {
        // TODO: 추후 추가
      };

      await saveTeamSchedule.mutateAsync({
        team_id: selectedTeamId,
        user_id: parseInt(user.id),
        week_start_date: state.mondayDateStr,
        schedule_data: scheduleData,
      });

      alert("팀 시간표가 성공적으로 저장되었습니다.");
      onSuccess?.(selectedTeamId);
      handleClose();
    } catch (error) {
      console.error("팀 시간표 저장 실패:", error);
      alert("팀 시간표 저장에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const handleClose = () => {
    setSelectedTeamId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          팀 시간표에 저장
        </h2>

        <p className="text-gray-600 mb-4">
          시간표를 저장할 팀을 선택해 주세요.
        </p>

        {teamsLoading ? (
          <div className="text-center py-8 text-gray-500">
            팀 목록을 불러오는 중...
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            소속된 팀이 없습니다.
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {teams.map((team) => (
              <label
                key={team.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTeamId === team.id
                    ? "border-[#3E4A82] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="team"
                  value={team.id}
                  checked={selectedTeamId === team.id}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="mr-3 text-[#3E4A82] focus:ring-[#3E4A82]"
                />
                <div>
                  <div className="font-medium text-gray-800">{team.name}</div>
                  {team.description && (
                    <div className="text-sm text-gray-500">
                      {team.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            disabled={saveTeamSchedule.isPending || teamsLoading}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={
              !selectedTeamId ||
              saveTeamSchedule.isPending ||
              teamsLoading ||
              teams.length === 0
            }
            className="flex-1 px-4 py-2 bg-[#3E4A82] text-white rounded-md hover:bg-[#2b2f4d] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveTeamSchedule.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamSaveModal;
