"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAllTeams } from "@/hooks/query/useTeamManagement";
import {
  useTeamStudioConnection,
  useSaveTeamStudioConnection,
  useAdminTeamStudioWeek,
} from "@/hooks/query/useTeamStudioConnection";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  createConnectedTeamStudioValues,
  getDefaultTeamStudioBindings,
} from "@/utils/template-studio/team-runtime";

const field =
  "h-9 w-full min-w-0 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs text-[var(--fg)]";
const button =
  "rounded-md border border-[var(--field-border)] px-3 py-2 text-xs disabled:opacity-40";
export function StudioConnectedTeamPreview({
  templateId,
  document,
  week,
  onPreview,
}: {
  templateId: string;
  document: StudioTemplateDocument;
  week: string;
  onPreview: (
    values: StudioRuntimeValues,
    bindings: Record<string, number>,
  ) => void;
}) {
  const connection = useTeamStudioConnection(templateId);
  const saved = connection.data?.connection;
  const query = useAdminTeamStudioWeek(templateId, saved?.teamId ?? "", week);
  useEffect(() => {
    if (!saved || !query.data || !document.domains?.timetable?.team) return;
    const { values } = createConnectedTeamStudioValues(
      {
        ...query.data,
        document,
        template: { id: templateId, name: "" },
        revisionNo: 0,
      },
      saved.memberBindings,
    );
    onPreview(values, saved.memberBindings);
  }, [saved, query.data, document, templateId, onPreview]);
  return null;
}

export function StudioTeamConnectionPanel({
  templateId,
  document,
  week,
  onWeekChange,
  onPreview,
  onSaveDesign,
  busy,
}: {
  templateId: string;
  document: StudioTemplateDocument;
  week: string;
  onWeekChange: (week: string) => void;
  onPreview: (
    values: StudioRuntimeValues,
    bindings: Record<string, number>,
  ) => void;
  onSaveDesign: () => Promise<boolean>;
  busy: boolean;
}) {
  const teams = useAllTeams();
  const connection = useTeamStudioConnection(templateId);
  const mutation = useSaveTeamStudioConnection(templateId);
  const [draft, setDraft] = useState<{
    teamId: string;
    bindings?: Record<string, number>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = connection.data?.connection;
  const teamId = draft?.teamId ?? saved?.teamId ?? "";
  const query = useAdminTeamStudioWeek(templateId, teamId, week);
  const slots = document.domains!.timetable!.team!.memberSlotIds;
  const bindings =
    draft?.bindings ??
    (draft ? undefined : saved?.memberBindings) ??
    getDefaultTeamStudioBindings(document, query.data?.members ?? []);
  const preview = query.data
    ? createConnectedTeamStudioValues(
        {
          ...query.data,
          document,
          template: { id: templateId, name: "" },
          revisionNo: 0,
        },
        bindings,
      )
    : null;
  const pending = busy || saving || mutation.isPending;
  const ready = Boolean(
    templateId && connection.isSuccess && query.isSuccess && !query.isFetching,
  );
  const applyPreview = () => {
    if (preview) onPreview(preview.values, bindings);
  };
  const save = async () => {
    if (!ready || pending) return;
    setSaving(true);
    setMessage("");
    try {
      // Persist current slots first, so server validation uses the current design.
      if (!(await onSaveDesign())) {
        setMessage("디자인 저장에 실패했습니다. 다시 저장해 주세요.");
        return;
      }
      const filtered = Object.fromEntries(
        Object.entries(bindings).filter(
          ([slot, id]) =>
            slots.includes(slot) &&
            query.data?.members.some((member) => member.userId === id),
        ),
      );
      await mutation.mutateAsync({ teamId, memberBindings: filtered });
      setDraft(null);
      applyPreview();
      setMessage("팀 연결과 멤버 배치를 저장했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };
  const disconnect = async () => {
    setMessage("");
    try {
      await mutation.mutateAsync(null);
      setDraft(null);
      setMessage("팀 연결을 해제했습니다. 현재 미리보기는 유지됩니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "연결 해제에 실패했습니다.",
      );
    }
  };
  return (
    <div className="grid min-w-0 gap-3" data-testid="studio-team-connection">
      <h3 className="text-sm font-bold">팀 연결</h3>
      <p className="text-xs text-[var(--fg3)]">
        기존 팀의 멤버와 주간 일정을 불러옵니다. 팀 연결은 저장 즉시 사용자
        시간표에 적용됩니다. 새로 추가한 슬롯은 디자인 발행 후 표시됩니다.
      </p>
      <Link
        href="/admin/teams"
        target="_blank"
        className="text-xs text-[var(--accent)] underline"
      >
        팀 관리 열기
      </Link>
      {!templateId && (
        <>
          <p className="text-xs">팀 연결 전에 디자인을 먼저 저장해 주세요.</p>
          <button
            type="button"
            className={button}
            disabled={pending}
            onClick={() => void onSaveDesign()}
          >
            디자인 저장
          </button>
        </>
      )}
      <label className="grid gap-1 text-xs">
        연결할 팀
        <select
          aria-label="연결할 팀"
          className={field}
          value={teamId}
          disabled={!templateId || pending || !connection.isSuccess}
          onChange={(event) => {
            setDraft({ teamId: event.target.value });
            setMessage("");
          }}
        >
          <option value="">팀 선택</option>
          {saved &&
            !teams.data?.some(
              (team) => team.id === saved.teamId && team.is_active,
            ) && (
              <option value={saved.teamId}>
                기존 연결 팀 (비활성 또는 조회 불가)
              </option>
            )}
          {teams.data
            ?.filter((team) => team.is_active)
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
      </label>
      {teamId && (
        <p className="break-all text-xs text-[var(--fg3)]">팀 ID: {teamId}</p>
      )}
      <label className="grid gap-1 text-xs">
        조회할 주 시작일
        <input
          type="date"
          aria-label="연결 팀 주 시작일"
          className={field}
          value={week}
          disabled={pending}
          onChange={(event) => {
            if (!event.target.value) return;
            const date = new Date(`${event.target.value}T00:00:00Z`);
            date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
            onWeekChange(date.toISOString().slice(0, 10));
          }}
        />
      </label>
      {(teams.isLoading ||
        (templateId && connection.isLoading) ||
        query.isLoading) && <p className="text-xs">팀 정보를 불러오는 중...</p>}
      {[teams.error, connection.error, query.error]
        .filter(Boolean)
        .map((error, index) => (
          <p role="alert" className="text-xs text-rose-400" key={index}>
            {error?.message}
          </p>
        ))}
      {teams.isSuccess && !teams.data.some((team) => team.is_active) && (
        <p className="text-xs">
          활성 팀이 없습니다. 팀 관리에서 팀을 생성해 주세요.
        </p>
      )}
      {slots.map((slot, index) => (
        <label key={slot} className="grid gap-1 text-xs">
          멤버 슬롯 {index + 1}
          <select
            aria-label={`연결 멤버 슬롯 ${index + 1}`}
            className={field}
            value={bindings[slot] ?? ""}
            disabled={!ready || pending}
            onChange={(event) => {
              const next = { ...bindings },
                id = Number(event.target.value);
              for (const key of Object.keys(next))
                if (next[key] === id) delete next[key];
              if (event.target.value) next[slot] = id;
              else delete next[slot];
              setDraft({ teamId, bindings: next });
              setMessage("");
            }}
          >
            <option value="">미연결</option>
            {bindings[slot] &&
              !query.data?.members.some(
                (member) => member.userId === bindings[slot],
              ) && (
                <option value={bindings[slot]}>
                  팀에서 제외된 유저 ({bindings[slot]})
                </option>
              )}
            {query.data?.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name} (ID: {member.userId})
              </option>
            ))}
          </select>
        </label>
      ))}
      {preview && preview.unassigned.length > 0 && (
        <p role="alert" className="text-xs text-amber-400">
          미연결 멤버:{" "}
          {preview.unassigned.map((member) => member.name).join(", ")}. 멤버
          배치를 지정하거나 디자인에 슬롯을 추가해 주세요.
        </p>
      )}
      {query.data && (
        <p className="text-xs text-[var(--fg3)]">
          미등록 일정:{" "}
          {query.data.members
            .filter(
              (member) =>
                !query.data.schedules.find(
                  (item) => item.user_id === member.userId,
                )?.success,
            )
            .map((member) => member.name)
            .join(", ") || "없음"}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          disabled={!ready || pending}
          onClick={applyPreview}
        >
          실제 일정 미리보기
        </button>
        <button
          type="button"
          className={button}
          disabled={!ready || pending}
          onClick={() => void save()}
        >
          팀 연결 저장
        </button>
        <button
          type="button"
          className={button}
          disabled={!saved || pending || !connection.isSuccess}
          onClick={() => void disconnect()}
        >
          연결 해제
        </button>
        <button
          type="button"
          className={button}
          disabled={pending || query.isFetching}
          onClick={() => {
            void teams.refetch();
            if (teamId) void query.refetch();
          }}
        >
          새로고침
        </button>
      </div>
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
