import { TeamService } from "@/services/teamService";
import { useQuery } from "@tanstack/react-query";
import { ArrowBigDownDash, CalendarDays, ImageDown, Save } from "lucide-react";
import React, { useMemo, useState } from "react";

interface ImageSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (width: number, height: number) => void;
  templateSize?: { width: number; height: number };
  isTeam?: boolean;
  mondayDateStr?: string;
  isTeamCalendar: boolean;
}

interface SizeOption {
  width: number;
  height: number;
  label: string;
  key: string;
}

interface WeekChipData {
  weekStartDate: string;
  label: string;
  status: "empty" | "saved";
  isCurrentWeek: boolean;
  isEllipsis?: boolean;
}

const ImageSaveModal: React.FC<ImageSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  templateSize,
  mondayDateStr,
  isTeam = false,
  isTeamCalendar,
}) => {
  // 기본 크기 설정 (templateSize가 없으면 기본값 사용)
  const originalWidth = templateSize?.width || 1280;
  const originalHeight = templateSize?.height || 720;

  // 저장 완료 상태 추가
  const [saveCompleted, setSaveCompleted] = useState(false);
  // 저장 중 상태 추가
  const [isSaving, setIsSaving] = useState(false);

  // 주차 계산
  const weekDates = useMemo(() => {
    if (!mondayDateStr) return null;

    // 현재 작성중인 주차 (템플릿에서 선택된 주차)
    const selectedWeek = TeamService.getWeekStartDateFromString(mondayDateStr);

    // 실제 이번주 (오늘 기준)
    const today = new Date();
    const actualThisWeek = TeamService.getWeekStartDate(today);

    const actualThisWeekDate = new Date(actualThisWeek);
    const nextWeekDate = new Date(actualThisWeekDate);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextNextWeekDate = new Date(actualThisWeekDate);
    nextNextWeekDate.setDate(nextNextWeekDate.getDate() + 14);

    const actualNextWeek = nextWeekDate.toISOString().split("T")[0];
    const actualNextNextWeek = nextNextWeekDate.toISOString().split("T")[0];

    return {
      selectedWeek, // 현재 작성중인 주차
      actualThisWeek, // 실제 이번주
      actualNextWeek, // 실제 다음주
      actualNextNextWeek, // 실제 다다음주
    };
  }, [mondayDateStr]);

  // 경우의 수 판단
  const displayCase = useMemo(() => {
    if (!weekDates) return null;

    const { selectedWeek, actualThisWeek, actualNextWeek, actualNextNextWeek } =
      weekDates;

    // 경우 1: 현재 작성중인 주차가 이번주, 다음주, 다다음주 중 하나
    if (
      selectedWeek === actualThisWeek ||
      selectedWeek === actualNextWeek ||
      selectedWeek === actualNextNextWeek
    ) {
      return {
        type: "within-three-weeks" as const,
        weeksToFetch: [actualThisWeek, actualNextWeek, actualNextNextWeek],
      };
    }

    // 경우 2: 현재 작성중인 주차가 이번주보다 이전
    if (selectedWeek < actualThisWeek) {
      return {
        type: "before-this-week" as const,
        weeksToFetch: [selectedWeek, actualThisWeek],
      };
    }

    // 경우 3: 현재 작성중인 주차가 다다음주 이후
    return {
      type: "after-three-weeks" as const,
      weeksToFetch: [actualThisWeek, selectedWeek],
    };
  }, [weekDates]);

  // 필요한 주차들의 저장 상태 확인 (isTeam이 true이고 isTeamCalendar가 false일 때만)
  const { data: week1Schedule } = useQuery({
    queryKey: ["userSchedule", displayCase?.weeksToFetch[0]],
    queryFn: () =>
      TeamService.getUserTeamSchedule(displayCase!.weeksToFetch[0]),
    enabled:
      isTeam && !isTeamCalendar && !!displayCase?.weeksToFetch[0] && isOpen,
  });

  const { data: week2Schedule } = useQuery({
    queryKey: ["userSchedule", displayCase?.weeksToFetch[1]],
    queryFn: () =>
      TeamService.getUserTeamSchedule(displayCase!.weeksToFetch[1]),
    enabled:
      isTeam && !isTeamCalendar && !!displayCase?.weeksToFetch[1] && isOpen,
  });

  const { data: week3Schedule } = useQuery({
    queryKey: ["userSchedule", displayCase?.weeksToFetch[2]],
    queryFn: () =>
      TeamService.getUserTeamSchedule(displayCase!.weeksToFetch[2]),
    enabled:
      isTeam && !isTeamCalendar && !!displayCase?.weeksToFetch[2] && isOpen,
  });

  // 칩 데이터 생성
  const weekChips: WeekChipData[] = useMemo(() => {
    if (!weekDates || !displayCase) return [];

    const { selectedWeek, actualThisWeek, actualNextWeek, actualNextNextWeek } =
      weekDates;
    const chips: WeekChipData[] = [];

    if (displayCase.type === "within-three-weeks") {
      // 경우 1: 이번주, 다음주, 다다음주만 표시
      chips.push(
        {
          weekStartDate: actualThisWeek,
          label: "이번주",
          isCurrentWeek: selectedWeek === actualThisWeek,
          status: week1Schedule ? "saved" : "empty",
        },
        {
          weekStartDate: actualNextWeek,
          label: "다음주",
          isCurrentWeek: selectedWeek === actualNextWeek,
          status: week2Schedule ? "saved" : "empty",
        },
        {
          weekStartDate: actualNextNextWeek,
          label: "다다음주",
          isCurrentWeek: selectedWeek === actualNextNextWeek,
          status: week3Schedule ? "saved" : "empty",
        }
      );
    } else if (displayCase.type === "before-this-week") {
      // 경우 2: 현재 작성중인 주차 ... 이번주
      chips.push(
        {
          weekStartDate: selectedWeek,
          label: getWeekLabel(selectedWeek, actualThisWeek),
          isCurrentWeek: true,
          status: week1Schedule ? "saved" : "empty",
        },
        {
          weekStartDate: "",
          label: "...",
          isCurrentWeek: false,
          status: "empty",
          isEllipsis: true,
        },
        {
          weekStartDate: actualThisWeek,
          label: "이번주",
          isCurrentWeek: false,
          status: week2Schedule ? "saved" : "empty",
        }
      );
    } else {
      // 경우 3: 이번주 ... 현재 작성중인 주차
      chips.push(
        {
          weekStartDate: actualThisWeek,
          label: "이번주",
          isCurrentWeek: false,
          status: week1Schedule ? "saved" : "empty",
        },
        {
          weekStartDate: "",
          label: "...",
          isCurrentWeek: false,
          status: "empty",
          isEllipsis: true,
        },
        {
          weekStartDate: selectedWeek,
          label: getWeekLabel(selectedWeek, actualThisWeek),
          isCurrentWeek: true,
          status: week2Schedule ? "saved" : "empty",
        }
      );
    }

    return chips;
  }, [weekDates, displayCase, week1Schedule, week2Schedule, week3Schedule]);

  // 주차 레이블 생성 헬퍼 함수
  function getWeekLabel(targetWeek: string, currentWeek: string): string {
    const target = new Date(targetWeek);
    const current = new Date(currentWeek);
    const diffTime = target.getTime() - current.getTime();
    const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));

    if (diffWeeks < 0) {
      return `${Math.abs(diffWeeks)}주 전`;
    } else if (diffWeeks > 0) {
      return `${diffWeeks}주 후`;
    }
    return "이번주";
  }

  // 16:9 비율 표준 크기 옵션 생성
  const getSizeOptions = (): SizeOption[] => {
    const options: SizeOption[] = [];

    // 1280 옵션 (항상 표시)
    options.push({
      width: 1280,
      height: 720, // 16:9 비율
      label: "HD",
      key: "1280",
    });

    // 1920 옵션 (원본이 1920보다 클 때만 표시)
    if (originalWidth > 1920) {
      options.push({
        width: 1920,
        height: 1080, // 16:9 비율
        label: "Full HD",
        key: "1920",
      });
    }

    // 4K 옵션 (원본이 3840보다 클 때만 표시)
    if (originalWidth > 3840) {
      options.push({
        width: 3840,
        height: 2160, // 16:9 비율
        label: "4K",
        key: "4k",
      });
    }

    // 원본 크기 옵션 (1280과 다를 때만 표시)
    if (originalWidth !== 1280) {
      const originalAspectRatio = originalHeight / originalWidth;
      options.push({
        width: originalWidth,
        height: Math.round(originalWidth * originalAspectRatio),
        label: `원본`,
        key: "original",
      });
    }

    return options;
  };

  const sizeOptions = getSizeOptions();
  const [selectedOption, setSelectedOption] = useState<SizeOption>(
    sizeOptions[0]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 저장 콜백 실행
      await onSave(selectedOption.width, selectedOption.height);

      // 팀 시간표 저장이 포함된 경우 저장 완료 상태로 전환
      if (isTeam && !isTeamCalendar) {
        setSaveCompleted(true);
      } else {
        // 팀 시간표가 아닌 경우 바로 모달 닫기
        onClose();
      }
    } catch (error) {
      console.error("저장 중 오류 발생:", error);
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // 저장 중일 때는 모달을 닫을 수 없음
    if (isSaving) return;

    setSelectedOption(sizeOptions[0]); // 첫 번째 옵션으로 리셋
    setSaveCompleted(false); // 저장 완료 상태 초기화
    setIsSaving(false); // 저장 중 상태 초기화
    onClose();
  };

  if (!isOpen) return null;

  // 칩 상태에 따른 스타일 (current는 저장 여부에 따라 saved 또는 empty 스타일 사용)
  const getChipStyle = (status: WeekChipData["status"]) => {
    switch (status) {
      case "saved":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "empty":
      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isSaving
              ? "저장 중..."
              : saveCompleted
              ? "저장 완료"
              : "시간표 저장"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {isSaving ? (
          // 저장 중 상태 - 로딩 스피너 표시
          <div className="px-8 pt-6 pb-4 flex flex-col gap-4 items-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3E4A82]"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                저장 중입니다...
              </h3>
              <p className="text-sm text-gray-600">
                {isTeam && !isTeamCalendar
                  ? "이미지와 팀 시간표를 저장하고 있습니다."
                  : "이미지를 저장하고 있습니다."}
              </p>
            </div>
          </div>
        ) : saveCompleted ? (
          // 저장 완료 상태 - 성공 메시지 표시
          <div className="px-8 pt-6 flex flex-col gap-4 items-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                저장이 완료되었습니다!
              </h3>
              <p className="text-sm text-gray-600">
                이미지와 팀 시간표가 성공적으로 저장되었습니다.
              </p>
            </div>
          </div>
        ) : (
          isTeam &&
          !isTeamCalendar && (
            <div className="px-8 pt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays color={"#3E4A82"} strokeWidth={2.5} />
                <p className="text-sm font-medium text-[#3E4A82]">
                  팀 시간표 저장
                </p>
              </div>

              <p className="text-xs text-[#3E4A82]">
                이미지 저장과 함께 현재 주차의 팀 시간표도 함께 저장됩니다. 주차
                정보를 확인하세요.
              </p>
            </div>
          )
        )}

        {/* 주차별 저장 상태 칩 (isTeam이 true이고 isTeamCalendar가 false일 때만 표시) */}
        {isTeam && !isTeamCalendar && weekChips.length > 0 && !isSaving && (
          <div className="px-6 pt-4 pb-2">
            {saveCompleted && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-800">
                  주차별 저장 상태
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  업데이트된 저장 상태를 확인하세요.
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {weekChips.map((chip, index) => (
                <div
                  key={chip.weekStartDate || `ellipsis-${index}`}
                  className="relative flex flex-col justify-center gap-1"
                >
                  {chip.isCurrentWeek && !chip.isEllipsis ? (
                    <div
                      className="h-6 flex justify-center items-center
                    px-3 rounded-lg text-xs font-medium border text-center bg-orange-100 text-orange-800 border-orange-400 gap-1"
                    >
                      <ArrowBigDownDash
                        color={"oklch(75% 0.183 55.934)"}
                        size={16}
                        strokeWidth={2.5}
                      />
                      <p className="text-xs">선택됨</p>
                    </div>
                  ) : (
                    <div className="h-6"></div>
                  )}
                  <div
                    className={`
                      w-full px-3 py-2 rounded-lg text-xs font-medium border text-center
                      ${
                        chip.isEllipsis
                          ? "bg-transparent border-transparent"
                          : getChipStyle(chip.status)
                      }
                    `}
                  >
                    {chip.isEllipsis ? (
                      <div className="flex justify-center items-center gap-2 text-gray-400 text-base w-full h-full">
                        {[0, 0, 0].map((_, i) => {
                          return (
                            <div
                              key={i}
                              className="w-2 h-2 rounded-full bg-gray-400"
                            ></div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex md:flex-row flex-col items-center justify-center gap-1">
                        <span className="font-semibold">{chip.label}</span>
                        {chip.weekStartDate && (
                          <span className="text-[10px] opacity-70">
                            (
                            {new Date(chip.weekStartDate).toLocaleDateString(
                              "ko-KR",
                              { month: "numeric", day: "numeric" }
                            )}
                            )
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 저장 예정 화살표 */}

                  {chip.isEllipsis ? (
                    <div className="h-6"></div>
                  ) : chip.status === "saved" ? (
                    <div
                      className="h-6 flex justify-center items-center
                    px-3 rounded-lg text-xs font-medium border text-center bg-blue-100 text-blue-800 border-blue-300 gap-1"
                    >
                      <Save
                        color={"oklch(42.4% 0.199 265.638)"}
                        size={"0.8rem"}
                        strokeWidth={2.5}
                      />
                      <p className="text-xs">저장됨</p>
                    </div>
                  ) : (
                    <div className="h-6"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 모달 내용 - 저장 완료 상태나 저장 중 상태가 아닐 때만 표시 */}
        {!saveCompleted && !isSaving && (
          <>
            <div className="px-8 pt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ImageDown color={"#3E4A82"} strokeWidth={2.5} />
                <p className="text-sm font-medium text-[#3E4A82]">
                  이미지 저장
                </p>
              </div>

              <p className="text-xs text-[#3E4A82]">
                저장할 이미지의 해상도를 선택하세요. 모든 크기는 16:9 비율로
                표준화됩니다.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* 크기 선택 옵션 */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {sizeOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setSelectedOption(option)}
                      className={`
                  w-full p-4 rounded-lg border-2 transition-all duration-200 text-left font-medium
                  ${
                    selectedOption.key === option.key
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }
                `}
                    >
                      <div className="text-lg font-bold">{option.label}</div>
                      <div className="text-sm text-gray-500">
                        {option.width}×{option.height}px
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 선택된 크기 정보 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">선택된 크기:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedOption.label}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">해상도:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedOption.width}×{selectedOption.height}px
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          {isSaving ? (
            // 저장 중 상태 - 버튼 비활성화
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#3E4A82]"></div>
              <span className="text-sm text-gray-600">저장 중...</span>
            </div>
          ) : saveCompleted ? (
            // 저장 완료 상태 - 확인 버튼만 표시
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-[#3E4A82] text-white rounded-lg brightness-100 hover:brightness-90 transition-all font-medium"
            >
              확인
            </button>
          ) : (
            // 일반 상태 - 취소/저장 버튼 표시
            <>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#3E4A82] text-white rounded-lg brightness-100 hover:brightness-90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    저장 중...
                  </>
                ) : (
                  "저장하기"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSaveModal;
