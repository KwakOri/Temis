"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import {
  useTeamStudioOptions,
  useTeamStudioWeek,
} from "@/hooks/query/useTeamStudioRuntime";
import {
  createConnectedTeamStudioValues,
  getDefaultTeamStudioBindings,
} from "@/utils/template-studio/team-runtime";
import { getStudioNearestPastMonday } from "@/utils/template-studio/runtime-week";
import { isStudioTeamImageUrl } from "@/utils/template-studio/team-timetable";
import { validateStudioRuntimeValuesForDocument } from "@/utils/template-studio/timetable-runtime";
import { TemplateStudioRuntimeShell } from "./runtime/template-studio-runtime-shell";

const field =
  "h-9 min-w-0 w-full rounded-md border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-2 text-xs";
export function TeamStudioRunClient({
  initialTemplateId = "",
}: {
  initialTemplateId?: string;
}) {
  const options = useTeamStudioOptions();
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [week, setWeek] = useState(getStudioNearestPastMonday);
  const [bindingsByContext, setBindings] = useState<
    Record<string, Record<string, number>>
  >({});
  const [images, setImages] = useState<Record<number, string>>({});
  const teamId = selectedTeam || options.data?.teams[0]?.id || "";
  const chosenTemplate = templateId || options.data?.templates[0]?.id || "";
  const result = useTeamStudioWeek(chosenTemplate, teamId, week);
  const data = result.data;
  const context = `${chosenTemplate}:${teamId}`;
  const defaults = useMemo(
    () =>
      data ? getDefaultTeamStudioBindings(data.document, data.members) : {},
    [data],
  );
  const bindings = bindingsByContext[context] ?? defaults;
  const connected = useMemo(
    () =>
      data ? createConnectedTeamStudioValues(data, bindings, images) : null,
    [data, bindings, images],
  );
  const errors =
    data && connected
      ? validateStudioRuntimeValuesForDocument(
          data.document,
          connected.values,
        ).filter((item) => item.severity === "error")
      : [];

  const controls = (onSaveImage?: () => void, isSavingImage = false) => (
    <aside
      data-testid="team-studio-connected-form"
      className="flex h-[55vh] min-h-[300px] w-full shrink-0 flex-col gap-3 border-t border-[var(--runtime-border)] bg-[var(--runtime-form-bg)] p-4 text-[var(--runtime-fg)] [overflow-wrap:anywhere] md:h-full md:w-[360px] md:border-l md:border-t-0"
    >
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto content-start">
        <h1 className="text-base font-semibold">팀 시간표</h1>
        <label className="grid gap-1 text-xs">
          템플릿
          <select
            aria-label="팀 Studio 템플릿"
            className={field}
            value={chosenTemplate}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            <option value="" disabled>
              템플릿 선택
            </option>
            {initialTemplateId &&
              !options.data?.templates.some(
                (item) => item.id === initialTemplateId,
              ) && <option value={initialTemplateId}>선택한 템플릿</option>}
            {options.data?.templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.memberSlotCount}명)
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          팀
          <select
            aria-label="실제 팀"
            className={field}
            value={teamId}
            onChange={(event) => setSelectedTeam(event.target.value)}
          >
            <option value="" disabled>
              팀 선택
            </option>
            {options.data?.teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          주 시작일
          <input
            aria-label="팀 주 시작일"
            type="date"
            step={7}
            className={field}
            value={week}
            onChange={(event) => {
              if (event.target.value) {
                const date = new Date(`${event.target.value}T00:00:00Z`);
                date.setUTCDate(
                  date.getUTCDate() - ((date.getUTCDay() + 6) % 7),
                );
                setWeek(date.toISOString().slice(0, 10));
              }
            }}
          />
        </label>
        {options.isLoading && <p className="text-xs">목록을 불러오는 중...</p>}
        {options.isError && (
          <p role="alert" className="text-xs text-red-600">
            {options.error.message}
          </p>
        )}
        {!options.isLoading &&
          !options.isError &&
          options.data?.templates.length === 0 && (
            <p className="text-xs">이용 가능한 발행된 팀 템플릿이 없습니다.</p>
          )}
        {!options.isLoading &&
          !options.isError &&
          options.data?.teams.length === 0 && (
            <p className="text-xs">소속된 활성 팀이 없습니다.</p>
          )}
        {result.isLoading && (
          <p className="text-xs">팀 일정을 불러오는 중...</p>
        )}
        {result.isError && (
          <p role="alert" className="text-xs text-red-600">
            {result.error.message}
          </p>
        )}
        {data?.document.domains?.timetable?.team?.memberSlotIds.map(
          (slot, index) => {
            const member = data.members.find(
              (item) => item.userId === bindings[slot],
            );
            return (
              <div
                key={slot}
                className="grid gap-2 border-t border-[var(--runtime-border)] pt-3"
              >
                <label className="grid gap-1 text-xs">
                  멤버 {index + 1}
                  <select
                    aria-label={`멤버 슬롯 ${index + 1}`}
                    className={field}
                    value={bindings[slot] ?? ""}
                    onChange={(event) => {
                      const id = Number(event.target.value),
                        next = { ...bindings };
                      for (const key of Object.keys(next))
                        if (next[key] === id) delete next[key];
                      if (event.target.value) next[slot] = id;
                      else delete next[slot];
                      setBindings((current) => ({
                        ...current,
                        [context]: next,
                      }));
                    }}
                  >
                    <option value="">미연결</option>
                    {data.members.map((item) => (
                      <option key={item.userId} value={item.userId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                {member && (
                  <label className="grid gap-1 text-xs">
                    이미지 URL
                    <input
                      key={`${teamId}:${member.userId}`}
                      aria-label={`멤버 이미지 ${index + 1}`}
                      className={field}
                      defaultValue={images[member.userId] ?? ""}
                      onBlur={(event) => {
                        const value = event.target.value;
                        if (!isStudioTeamImageUrl(value)) {
                          event.target.setCustomValidity(
                            "HTTPS 이미지 URL을 입력해 주세요.",
                          );
                          event.target.reportValidity();
                          return;
                        }
                        event.target.setCustomValidity("");
                        setImages((current) => ({
                          ...current,
                          [member.userId]: value,
                        }));
                      }}
                      onChange={(event) => event.target.setCustomValidity("")}
                    />
                  </label>
                )}
              </div>
            );
          },
        )}
        {connected && connected.unassigned.length > 0 && (
          <p role="alert" className="text-xs text-red-600">
            미연결 멤버:{" "}
            {connected.unassigned.map((member) => member.name).join(", ")}
          </p>
        )}
        {data && (
          <p className="text-xs">
            미등록 일정:{" "}
            {data.schedules
              .filter((item) => !item.success)
              .map(
                (item) =>
                  data.members.find((member) => member.userId === item.user_id)
                    ?.name,
              )
              .join(", ") || "없음"}
          </p>
        )}
        {errors.map((error) => (
          <p role="alert" key={error.id} className="text-xs text-red-600">
            {error.detail}
          </p>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-[var(--runtime-border)] pt-3">
        <button
          type="button"
          title="일정 새로고침"
          aria-label="일정 새로고침"
          disabled={result.isFetching || options.isFetching}
          onClick={() => {
            void options.refetch();
            if (teamId && chosenTemplate) void result.refetch();
          }}
          className="p-2"
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          title="팀 PNG 다운로드"
          aria-label="팀 PNG 다운로드"
          disabled={
            !onSaveImage ||
            isSavingImage ||
            result.isFetching ||
            errors.length > 0 ||
            Boolean(connected?.unassigned.length)
          }
          onClick={onSaveImage}
          className="flex items-center gap-2 rounded-md border border-[var(--runtime-border)] px-3 py-2 text-xs"
        >
          <Download size={16} />
          PNG 다운로드
        </button>
        <Link href="/my-page" className="text-xs underline">
          마이페이지
        </Link>
      </div>
    </aside>
  );
  if (!data || !connected || result.isError || errors.length)
    return (
      <main className="studio-runtime-theme flex h-screen flex-col items-center justify-center bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)]">
        {controls()}
      </main>
    );
  return (
    <TemplateStudioRuntimeShell
      document={data.document}
      initialRuntimeValues={connected.values}
      preserveInitialWeek
      source="published"
      backHref="/my-page"
      templateName={data.template.name}
      renderForm={({ onSaveImage, isSavingImage }) =>
        controls(onSaveImage, isSavingImage)
      }
    />
  );
}
