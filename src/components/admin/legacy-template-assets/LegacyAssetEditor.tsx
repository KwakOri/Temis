"use client";
/* eslint-disable @next/next/no-img-element -- Assets use ordinary images, not Next image optimization. */
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  RefreshCw,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react";
import { cva } from "class-variance-authority";
import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useLegacyAssetDetail,
  useLegacyAssetMutations,
  useLegacyAssetPreview,
} from "@/hooks/query/useLegacyTemplateAssets";
import type {
  LegacyAssetChange,
  LegacyAssetDetail,
  LegacyAssetOwner,
} from "@/types/legacy-template-assets";
import { ownerLabels, purposeLabels } from "./LegacyAssetList";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded border px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      intent: {
        default: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
      },
    },
    defaultVariants: { intent: "default" },
  },
);
const runtimePaths = {
  timetable: "time-table",
  team_timetable: "team-time-table",
  thumbnail: "thumbnails",
  site: "",
};
const assetUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "")}/${path}`;

export function LegacyAssetEditor({ owner }: { owner: LegacyAssetOwner }) {
  const query = useLegacyAssetDetail(owner);
  if (query.isLoading) return <p role="status">불러오는 중...</p>;
  if (query.isError)
    return (
      <p role="alert" className="text-red-700">
        {query.error.message}
      </p>
    );
  if (!query.data) return null;
  return (
    <Editor
      key={`${query.data.set.id}:${query.data.set.active_revision_id}`}
      owner={owner}
      detail={query.data}
      refresh={() => query.refetch()}
    />
  );
}
function Editor({
  owner,
  detail,
  refresh,
}: {
  owner: LegacyAssetOwner;
  detail: LegacyAssetDetail;
  refresh: () => void;
}) {
  const mutations = useLegacyAssetMutations(owner);
  const [theme, setTheme] = useState(Object.keys(detail.set.expected_slots)[0]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [changes, setChanges] = useState<LegacyAssetChange[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const previewQuery = useLegacyAssetPreview(
    owner,
    preview && owner.purpose === "cover" ? changes : null,
  );
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const revision = detail.revisions.find(
    (item) => item.id === detail.set.active_revision_id,
  );
  const versions = new Map(detail.versions.map((item) => [item.id, item]));
  const busy = Object.values(mutations).some((mutation) => mutation.isPending);
  const slots = Object.entries(detail.set.expected_slots).flatMap(
    ([slotTheme, keys]) =>
      keys.map((key) => ({
        theme: slotTheme,
        key,
        identity: JSON.stringify([slotTheme, key]),
        versionId: revision?.bindings[slotTheme]?.[key],
      })),
  );
  const displayed = slots.filter(
    (slot) =>
      slot.theme === theme &&
      slot.key.toLowerCase().includes(filter.toLowerCase()),
  );
  const perform = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리하지 못했습니다.");
    }
  };
  const upload = async (file?: File) => {
    if (!file || !selected.length) return;
    await perform(async () => {
      const first = slots.find((slot) => slot.identity === selected[0]);
      const current = first?.versionId ? versions.get(first.versionId) : null;
      if (!current) throw new Error("현재 이미지 버전이 없습니다.");
      const version = await mutations.upload.mutateAsync({
        assetId: current.asset_id,
        file,
      });
      const replacements = slots
        .filter((slot) => selected.includes(slot.identity))
        .map((slot) => ({
          theme: slot.theme,
          key: slot.key,
          versionId: version.id,
        }));
      setChanges((old) => [
        ...old.filter(
          (change) =>
            !replacements.some(
              (next) => next.theme === change.theme && next.key === change.key,
            ),
        ),
        ...replacements,
      ]);
      setPreview(false);
    });
  };
  return (
    <div className="space-y-5 text-gray-900">
      <Link
        href="/admin/legacy-template-assets"
        className="inline-flex items-center gap-2 text-sm text-gray-600"
      >
        <ArrowLeft className="h-4 w-4" />
        에셋 목록
      </Link>
      <AdminTabHeader
        title={detail.set.name}
        description={`${ownerLabels[owner.ownerKind]} · ${purposeLabels[owner.purpose ?? "runtime"]} · ${detail.set.mode === "r2" ? "R2" : "로컬"} · #${revision?.revision_no ?? 0}`}
      >
        <button
          aria-label="새로고침"
          title="새로고침"
          className="p-2"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </AdminTabHeader>
      {error && (
        <p
          role="alert"
          className="border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-y border-gray-200 py-3">
        <select
          aria-label="테마"
          className="rounded border border-gray-300 p-2 text-sm"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
        >
          {Object.keys(detail.set.expected_slots).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <input
          aria-label="이미지 키 검색"
          placeholder="이미지 키"
          className="min-w-0 rounded border border-gray-300 p-2 text-sm"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <label className={button()}>
          <Upload className="h-4 w-4" />
          {mutations.upload.isPending
            ? "검증 중..."
            : `${selected.length}개 교체`}
          <input
            aria-label="교체 이미지 업로드"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="sr-only"
            disabled={busy || !selected.length}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void upload(file);
            }}
          />
        </label>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={detail.set.mode === "r2"}
            disabled={busy || !!changes.length || !revision}
            onChange={(event) => {
              const mode = event.target.checked ? "r2" : "local";
              void perform(() =>
                mutations.mode.mutateAsync({
                  expectedRevisionId: detail.set.active_revision_id,
                  mode,
                }),
              );
            }}
          />
          R2 적용
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayed.map((slot) => {
          const current = slot.versionId ? versions.get(slot.versionId) : null;
          const change = changes.find(
            (item) => item.theme === slot.theme && item.key === slot.key,
          );
          const next = change ? versions.get(change.versionId) : null;
          const shared = current
            ? slots.filter(
                (item) =>
                  item.versionId &&
                  versions.get(item.versionId)?.asset_id === current.asset_id,
              )
            : [];
          return (
            <article
              key={slot.identity}
              className="min-w-0 rounded border border-gray-200 bg-white p-3"
            >
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(slot.identity)}
                  onChange={(event) =>
                    setSelected((old) =>
                      event.target.checked
                        ? [...old, slot.identity]
                        : old.filter((id) => id !== slot.identity),
                    )
                  }
                />
                <span className="break-all text-sm font-medium">
                  {slot.key}
                </span>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[current, next].map((version, index) => (
                  <div key={index}>
                    <p className="mb-1 text-xs text-gray-500">
                      {index === 0 ? "현재" : "교체 후보"}
                    </p>
                    <div className="flex h-28 items-center justify-center overflow-hidden border border-gray-100 bg-gray-50">
                      {version ? (
                        <img
                          src={
                            version.public_url ?? assetUrl(version.storage_path)
                          }
                          alt={version.original_filename}
                          className="h-full w-full object-contain"
                          onError={(event) => {
                            event.currentTarget.alt = "이미지 로딩 실패";
                          }}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 break-all text-xs text-gray-600">
                {current?.original_filename}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {current?.width} × {current?.height} ·{" "}
                {Math.round((current?.byte_size ?? 0) / 1024)} KB
              </p>
              {shared.length > 1 && (
                <details className="mt-2 text-xs text-gray-500">
                  <summary>공유 슬롯 {shared.length}개</summary>
                  <ul className="mt-1 space-y-1">
                    {shared.map((item) => (
                      <li key={item.identity} className="break-all">
                        {item.theme} / {item.key}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="mt-2 text-blue-700"
                    onClick={() =>
                      setSelected((old) => [
                        ...new Set([
                          ...old,
                          ...shared.map((item) => item.identity),
                        ]),
                      ])
                    }
                  >
                    공유 슬롯 선택
                  </button>
                </details>
              )}
              {change && (
                <button
                  className="mt-2 inline-flex items-center gap-1 text-xs text-red-700"
                  onClick={() => {
                    setChanges((old) => old.filter((item) => item !== change));
                    setPreview(false);
                  }}
                >
                  <X className="h-3 w-3" />
                  후보 취소
                </button>
              )}
            </article>
          );
        })}
      </div>
      <section className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="변경 메모"
            maxLength={1000}
            value={note}
            placeholder="변경 메모"
            onChange={(event) => setNote(event.target.value)}
            className="min-w-0 flex-1 rounded border border-gray-300 p-2 text-sm"
          />
          <button
            className={button()}
            disabled={!changes.length || busy}
            onClick={() => setPreview(true)}
          >
            <Eye className="h-4 w-4" />
            {owner.purpose === "cover"
              ? "이미지 미리보기"
              : owner.ownerKind === "site"
                ? "홈 미리보기"
                : "시간표 미리보기"}
          </button>
          <button
            className={button({ intent: "primary" })}
            disabled={!changes.length || busy}
            onClick={() =>
              void perform(async () => {
                await mutations.apply.mutateAsync({
                  expectedRevisionId: detail.set.active_revision_id,
                  changes,
                  note,
                });
                setChanges([]);
              })
            }
          >
            <Save className="h-4 w-4" />
            {mutations.apply.isPending
              ? "적용 중..."
              : `${changes.length}개 적용`}
          </button>
        </div>
        {preview &&
          owner.purpose === "cover" &&
          (previewQuery.isError ? (
            <p role="alert" className="text-red-700">
              {previewQuery.error.message}
            </p>
          ) : previewQuery.isPending ? (
            <p role="status">불러오는 중...</p>
          ) : (
            <img
              alt="교체 후보 대표 썸네일"
              className="max-h-[600px] w-full object-contain"
              src={previewQuery.data.images.first.cover.src}
            />
          ))}
        {preview && owner.purpose !== "cover" && (
          <iframe
            title="교체 후보 시간표"
            className="h-[600px] w-full border border-gray-200"
            src={`${owner.ownerKind === "site" ? "/" : `/${runtimePaths[owner.ownerKind]}/${owner.templateId}`}?legacyAssetPreview=${encodeURIComponent(JSON.stringify(changes))}`}
          />
        )}
      </section>
      <section className="border-t border-gray-200 pt-4">
        <h2 className="mb-3 text-base font-semibold">변경 이력</h2>
        <ul className="divide-y divide-gray-200">
          {detail.revisions.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 py-3 text-sm"
            >
              <span className="font-medium">#{item.revision_no}</span>
              <span className="min-w-0 flex-1 break-words">
                {item.note || "초기 이관"}
              </span>
              <time className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString("ko-KR")}
              </time>
              {item.id === detail.set.active_revision_id ? (
                <span className="text-green-700">현재</span>
              ) : (
                <button
                  className={button()}
                  disabled={busy || !!changes.length}
                  onClick={() => setConfirmRestore(item.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                  복원
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {confirmRestore && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 이력 복원"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5">
            <h2 className="text-base font-semibold">
              선택한 이력으로 복원할까요?
            </h2>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className={button()}
                disabled={busy}
                onClick={() => setConfirmRestore(null)}
              >
                취소
              </button>
              <button
                className={button({ intent: "primary" })}
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await mutations.restore.mutateAsync({
                      expectedRevisionId: detail.set.active_revision_id,
                      revisionId: confirmRestore,
                    });
                    setConfirmRestore(null);
                  })
                }
              >
                <RotateCcw className="h-4 w-4" />
                복원
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
