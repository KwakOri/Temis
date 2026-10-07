"use client";
import React, { useEffect, useState } from "react";
import { Plus, Trash2, ArrowUp } from "lucide-react";
import type {
  StudioTeamDefinition,
  StudioTeamRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  StudioNumberField,
  StudioTextField,
} from "@/components/studio/inspector/studio-inspector-fields";
import { createStudioId } from "@/utils/template-studio/id";
import {
  STUDIO_TEAM_LAYOUTS,
  isStudioTeamImageUrl,
} from "@/utils/template-studio/team-timetable";

const fieldClass =
  "h-8 min-w-0 w-full rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs text-[var(--fg)]";
export function StudioTeamControls({
  document,
  preview,
  onDefinitionChange,
  onPreviewChange,
  definitionEditable = true,
  membersManagedByTeam = false,
  selectedMemberId,
  onSelectMember,
  selectedDayId,
  onSelectDay,
  onSelectComponent,
  showImages = true,
  showPreviewFields = true,
}: {
  document: StudioTemplateDocument;
  preview: StudioTeamRuntimeValues | undefined;
  onDefinitionChange: (definition: StudioTeamDefinition) => void;
  onPreviewChange: (values: StudioTeamRuntimeValues) => void;
  definitionEditable?: boolean;
  membersManagedByTeam?: boolean;
  selectedMemberId?: string;
  onSelectMember?: (id: string) => void;
  selectedDayId?: string;
  onSelectDay?: (id: string) => void;
  onSelectComponent?: (id: string) => void;
  showImages?: boolean;
  showPreviewFields?: boolean;
}) {
  const team = document.domains!.timetable!.team!;
  const [selectedId, selectId] = useState(team.memberSlotIds[0]);
  const [selectedDay, selectDay] = useState(
    document.domains!.timetable!.dayIds[0],
  );
  const [imageError, setImageError] = useState("");
  const currentId = selectedMemberId ?? selectedId;
  const id = team.memberSlotIds.includes(currentId)
    ? currentId
    : team.memberSlotIds[0];
  const currentDay = selectedDayId ?? selectedDay;
  const dayId = document.domains!.timetable!.dayIds.includes(currentDay)
    ? currentDay
    : document.domains!.timetable!.dayIds[0];
  const selectMember = (id: string) => {
    selectId(id);
    onSelectMember?.(id);
  };
  const selectPreviewDay = (id: string) => {
    selectDay(id);
    onSelectDay?.(id);
  };
  const member = preview?.members[id] ?? { name: id, image: "", days: {} };
  const [imageDraft, setImageDraft] = useState(member.image);
  useEffect(() => {
    setImageDraft(member.image);
    setImageError("");
  }, [id, member.image]);
  const day = member.days[dayId] ?? { status: "missing" as const, entries: [] };
  const updateMember = (patch: Partial<typeof member>) =>
    onPreviewChange({
      members: { ...preview?.members, [id]: { ...member, ...patch } },
    });
  const updateDay = (patch: Partial<typeof day>) =>
    updateMember({ days: { ...member.days, [dayId]: { ...day, ...patch } } });
  const change = (patch: Partial<StudioTeamDefinition>) =>
    onDefinitionChange({ ...team, ...patch });
  const remove = () => {
    const slotIds = team.memberSlotIds.filter((slot) => slot !== id);
    change({
      memberSlotIds: slotIds,
      memberComponentIds: Object.fromEntries(
        Object.entries(team.memberComponentIds ?? {}).filter(
          ([slot]) => slot !== id,
        ),
      ),
    });
    selectMember(slotIds[0]);
  };
  return (
    <div className="grid min-w-0 gap-3" data-team-controls>
      {definitionEditable && (
        <>
          <label className="grid gap-1 text-xs">
            배치
            <select
              aria-label="팀 배치"
              className={fieldClass}
              value={team.layout}
              onChange={(event) =>
                change({
                  layout: event.target.value as StudioTeamDefinition["layout"],
                  ...(event.target.value === "member-rows"
                    ? { order: "member" as const }
                    : {}),
                })
              }
            >
              {STUDIO_TEAM_LAYOUTS.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.label}
                </option>
              ))}
            </select>
          </label>
          {team.layout === "day-grid" && (
            <StudioNumberField
              label="열 수"
              value={team.columns}
              onChange={(value) =>
                change({ columns: Math.max(1, Math.min(7, Math.round(value))) })
              }
            />
          )}
          <StudioNumberField
            label="간격"
            value={team.gap}
            onChange={(value) =>
              change({ gap: Math.max(0, Math.min(40, Math.round(value))) })
            }
          />
          <label className="grid gap-1 text-xs">
            정렬
            <select
              aria-label="팀 정렬"
              className={fieldClass}
              value={team.order}
              disabled={team.layout === "member-rows"}
              onChange={(event) =>
                change({
                  order: event.target.value as StudioTeamDefinition["order"],
                })
              }
            >
              <option value="member">멤버 순서</option>
              <option value="time">방송 시간</option>
            </select>
          </label>
        </>
      )}
      <div className="grid gap-1 text-xs">
        <span>미리보기 멤버</span>
        <div className="flex min-w-0 items-center gap-1">
          <select
            aria-label="멤버 슬롯"
            className={fieldClass}
            value={id}
            onChange={(event) => selectMember(event.target.value)}
          >
            {team.memberSlotIds.map((slot, index) => (
              <option key={slot} value={slot}>
                {index + 1}. {preview?.members[slot]?.name ?? slot}
              </option>
            ))}
          </select>
          {definitionEditable && !membersManagedByTeam && (
            <>
              <button
                type="button"
                className="shrink-0 p-1"
                title="멤버 슬롯 추가"
                aria-label="멤버 슬롯 추가"
                disabled={team.memberSlotIds.length >= 12}
                onClick={() => {
                  const slotId = createStudioId("member");
                  change({ memberSlotIds: [...team.memberSlotIds, slotId] });
                  selectMember(slotId);
                }}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="shrink-0 p-1"
                title="멤버 슬롯 삭제"
                aria-label="멤버 슬롯 삭제"
                disabled={team.memberSlotIds.length <= 1}
                onClick={remove}
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                className="shrink-0 p-1"
                title="멤버 위로 이동"
                aria-label="멤버 위로 이동"
                disabled={team.memberSlotIds.indexOf(id) === 0}
                onClick={() => {
                  const ids = [...team.memberSlotIds],
                    index = ids.indexOf(id);
                  [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                  change({ memberSlotIds: ids });
                }}
              >
                <ArrowUp size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      {membersManagedByTeam && (
        <p className="text-xs text-[var(--fg3)]">
          인원은 연결한 팀을 기준으로 표시합니다. 팀 관리에서 멤버를 변경해
          주세요.
        </p>
      )}
      {definitionEditable && (
        <label className="grid gap-1 text-xs">
          멤버 카드 디자인
          <select
            aria-label="멤버 카드 디자인"
            className={fieldClass}
            value={team.memberComponentIds?.[id] ?? ""}
            onChange={(event) => {
              const next = { ...team.memberComponentIds };
              if (event.target.value) next[id] = event.target.value;
              else delete next[id];
              change({ memberComponentIds: next });
              onSelectComponent?.(
                event.target.value ||
                  document.domains!.timetable!.entryComponentId,
              );
            }}
          >
            <option value="">공통 디자인</option>
            {Object.values(document.domains!.timetable!.components).map(
              (component) => (
                <option key={component.id} value={component.id}>
                  {component.label}
                </option>
              ),
            )}
          </select>
        </label>
      )}
      <select
        aria-label="미리보기 요일"
        className={fieldClass}
        value={dayId}
        onChange={(event) => selectPreviewDay(event.target.value)}
      >
        {document.domains!.timetable!.dayIds.map((day) => (
          <option key={day} value={day}>
            {document.domains!.timetable!.days[day].label}
          </option>
        ))}
      </select>
      {showPreviewFields && (
        <>
          <h4 className="border-t border-[var(--border)] pt-3 text-xs font-semibold">
            {definitionEditable ? "미리보기 데이터" : "팀 일정"}
          </h4>
          <StudioTextField
            label="멤버 이름"
            value={member.name}
            onChange={(name) => updateMember({ name: name.slice(0, 80) })}
          />
          {showImages && (
            <>
              <label className="grid gap-1 text-xs">
                멤버 이미지 URL
                <input
                  aria-label="멤버 이미지 URL"
                  className={fieldClass}
                  value={imageDraft}
                  onChange={(event) => setImageDraft(event.target.value)}
                  onBlur={() => {
                    if (!isStudioTeamImageUrl(imageDraft)) {
                      setImageError("HTTPS 이미지 URL이 필요합니다.");
                      return;
                    }
                    setImageError("");
                    updateMember({ image: imageDraft });
                  }}
                />
              </label>
              {imageError && (
                <p className="text-xs text-rose-400">{imageError}</p>
              )}
            </>
          )}
          <select
            aria-label="멤버 일정 상태"
            className={fieldClass}
            value={day.status}
            onChange={(event) =>
              updateDay({ status: event.target.value as typeof day.status })
            }
          >
            <option value="online">방송</option>
            <option value="offline">휴방</option>
            <option value="missing">미등록</option>
          </select>
          {day.status === "online" && (
            <>
              {day.entries.map((entry, index) => (
                <div
                  key={index}
                  className="grid gap-2 border-t border-[var(--border)] pt-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    방송 {index + 1}
                    <button
                      type="button"
                      aria-label={`방송 ${index + 1} 삭제`}
                      title="방송 삭제"
                      onClick={() =>
                        updateDay({
                          entries: day.entries.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {(["mainTitle", "subTitle", "time"] as const).map((key) => (
                    <StudioTextField
                      key={key}
                      label={
                        key === "mainTitle"
                          ? "제목"
                          : key === "subTitle"
                            ? "부제"
                            : "시간"
                      }
                      value={entry[key]}
                      onChange={(value) =>
                        updateDay({
                          entries: day.entries.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  [key]: value.slice(
                                    0,
                                    key === "time" ? 40 : 500,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                  ))}
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={entry.isGuerrilla}
                      onChange={(event) =>
                        updateDay({
                          entries: day.entries.map((item, i) =>
                            i === index
                              ? { ...item, isGuerrilla: event.target.checked }
                              : item,
                          ),
                        })
                      }
                    />
                    게릴라
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="flex items-center gap-1 text-xs"
                disabled={day.entries.length >= 20}
                onClick={() =>
                  updateDay({
                    entries: [
                      ...day.entries,
                      {
                        mainTitle: "새 방송",
                        subTitle: "",
                        time: "18:00",
                        isGuerrilla: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={14} />
                방송 추가
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
