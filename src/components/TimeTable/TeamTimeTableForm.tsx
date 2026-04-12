import ImageSaveModal from '@/components/TimeTable/ImageSaveModal';
import MondaySelector from '@/components/TimeTable/MondaySelector';
import ResetButton from '@/components/TimeTable/ResetButton';
import TimeTableFormTabs from '@/components/TimeTable/TimeTableFormTabs';
import CardTitle from '@/components/TimeTable/FixedComponents/CardTitle';
import { useTimeTable } from '@/contexts/TimeTableContext';
import {
  useHasActiveTeam,
  useSaveTeamScheduleFromDynamicCards,
} from '@/hooks/query/useTeam';
import { TeamService } from '@/services/teamService';
import { TDefaultCard } from '@/types/time-table/data';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import React, { PropsWithChildren, useState } from 'react';

export interface UnregisteredMember {
  userId: number;
  label: string;
}

interface TeamTimeTableFormProps {
  addons?: React.ReactNode;
  onReset: () => void;
  saveable?: boolean;
  teamData?: TDefaultCard[];
  unregisteredMembers?: UnregisteredMember[];
}

const TeamTimeTableForm = ({
  addons,
  children,
  onReset,
  teamData,
  unregisteredMembers = [],
  saveable = true,
}: PropsWithChildren<TeamTimeTableFormProps>) => {
  const { state, actions } = useTimeTable();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('main');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { data: isTeam = false } = useHasActiveTeam();
  const saveTeamScheduleMutation = useSaveTeamScheduleFromDynamicCards();

  const templateId = pathname?.split('/').pop();
  const { data: isTeamCalendar = false } = useQuery({
    queryKey: ['isTeamCalendar', templateId],
    queryFn: async () => {
      if (!templateId) return false;

      try {
        const response = await fetch(`/api/team-template/check/${templateId}`);
        if (!response.ok) return false;

        const data = await response.json();
        return data.isTeamTemplate || false;
      } catch (error) {
        console.error('Error checking team calendar:', error);
        return false;
      }
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });

  const { mondayDateStr, captureSize } = state;
  const { handleDateChange, downloadImage } = actions;

  const onChangeActiveTab = (nextTab: string) => {
    setActiveTab(nextTab);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleSaveModalClose = () => {
    setShowSaveModal(false);
  };

  const handleImageSave = async (width: number, height: number) => {
    try {
      downloadImage(width, height);

      if (isTeam && !isTeamCalendar && saveable && teamData) {
        const weekStartDate =
          TeamService.getWeekStartDateFromString(mondayDateStr);

        await saveTeamScheduleMutation.mutateAsync({
          weekStartDate,
          dynamicCards: teamData,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('팀 시간표 자동 저장 실패:', error);
      throw error;
    }
  };

  const renderMainSettings = () => (
    <div className="space-y-4">
      <h3 className="pl-1 font-bold text-lg text-gray-800">시간표</h3>
      <MondaySelector
        mondayDateStr={mondayDateStr}
        onDateChange={handleDateChange}
      />

      <h3 className="pl-1 font-bold text-lg text-gray-800">미작성 멤버</h3>

      {unregisteredMembers.length === 0 && (
        <div className="h-12 flex items-center px-3 bg-timetable-card-bg shadow-[0_2px_3.4px_rgba(0,0,0,0.08)] border-2 border-timetable-card-border rounded-2xl">
          <span className="text-sm text-gray-500 font-medium">
            모든 멤버가 시간표를 등록했어요.
          </span>
        </div>
      )}

      {unregisteredMembers.length > 0 && (
        <div className="space-y-2 max-h-44 overflow-y-auto">
          {unregisteredMembers.map((member) => (
            <div
              key={`unregistered-${member.userId}`}
              className="h-12 gap-4 flex justify-between items-center bg-timetable-card-bg shadow-[0_2px_3.4px_rgba(0,0,0,0.08)] border-2 border-timetable-card-border rounded-2xl px-3"
            >
              <CardTitle size="sm" label={member.label} />
              <span className="text-xs font-semibold text-gray-500">미작성</span>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );

  const renderAddonsContent = () => (addons ? <>{addons}</> : null);

  return (
    <>
      <div className="md:h-full min-h-0 md:max-w-[400px] md:min-w-[300px] md:w-1/4 h-full">
        <div className="h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full ">
          <div className="flex-1 flex flex-col min-h-0">
            <TimeTableFormTabs
              activeTab={activeTab}
              onChangeActiveTab={onChangeActiveTab}
              isAddons={!!addons}
            />
            <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
              {activeTab === 'main' && renderMainSettings()}
              {activeTab === 'addons' && renderAddonsContent()}
            </div>
          </div>

          <div className="p-4 border-t border-gray-300 bg-timetable-form-bg">
            <div className="flex gap-2">
              <button
                onClick={
                  saveable
                    ? handleSaveClick
                    : () => {
                        alert('PLAYGROUND에서는 제공되지 않는 기능입니다.');
                      }
                }
                className="flex-1 bg-timetable-primary text-white py-3 rounded-md text-base font-bold hover:bg-timetable-primary-hover transition"
              >
                이미지로 저장
              </button>
              <ResetButton onReset={onReset} />
            </div>
          </div>
        </div>
      </div>

      <ImageSaveModal
        isTeamCalendar={isTeamCalendar}
        isOpen={showSaveModal}
        onClose={handleSaveModalClose}
        onSave={handleImageSave}
        templateSize={captureSize}
        isTeam={isTeam}
        mondayDateStr={mondayDateStr}
      />
    </>
  );
};

export default TeamTimeTableForm;
