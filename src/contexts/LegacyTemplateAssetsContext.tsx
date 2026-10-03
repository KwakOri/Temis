"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLegacyAssetPreview,
  useLegacyAssetRuntime,
} from "@/hooks/query/useLegacyTemplateAssets";
import type {
  LegacyAssetChange,
  LegacyAssetOwner,
  LegacyAssetRuntime,
} from "@/types/legacy-template-assets";
import { parseLegacyAssetOwner } from "@/utils/legacy-template-assets/contracts";

const Context = createContext<LegacyAssetRuntime | null>(null);
export function LegacyTemplateAssetsRoute({
  children,
  ownerKind,
}: PropsWithChildren<{ ownerKind: LegacyAssetOwner["ownerKind"] }>) {
  const pathname = usePathname();
  const id = pathname.split("/")[2];
  let owner;
  try {
    owner = parseLegacyAssetOwner(ownerKind, id ?? "");
  } catch {
    return <>{children}</>;
  }
  return (
    <LegacyTemplateAssetsProvider key={`${ownerKind}:${id}`} owner={owner}>
      {children}
    </LegacyTemplateAssetsProvider>
  );
}
export function LegacyTemplateAssetsProvider({
  children,
  owner,
}: PropsWithChildren<{ owner: LegacyAssetOwner }>) {
  const { user, loading } = useAuth();
  const [changes, setChanges] = useState<LegacyAssetChange[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get(
      "legacyAssetPreview",
    );
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length > 2000) throw new Error();
        setChanges(parsed);
      } catch {
        setPreviewError("미리보기 정보가 올바르지 않습니다.");
      }
    }
  }, []);
  const enabled = process.env.NEXT_PUBLIC_LEGACY_TEMPLATE_R2_ENABLED === "true";
  const runtime = useLegacyAssetRuntime(owner, enabled && !changes);
  const preview = useLegacyAssetPreview(owner, changes);
  if (loading && (enabled || changes))
    return (
      <p role="status" className="p-5">
        이미지 권한 확인 중...
      </p>
    );
  const query = changes ? preview : runtime;
  const error =
    previewError ||
    (changes && !user?.isAdmin
      ? "관리자만 교체 후보를 미리볼 수 있습니다."
      : "") ||
    (query.error instanceof Error ? query.error.message : "");
  if (error)
    return (
      <div role="alert" className="p-5 text-red-700">
        {error}
        <button className="ml-3 underline" onClick={() => query.refetch()}>
          다시 시도
        </button>
      </div>
    );
  if (
    (enabled || changes) &&
    query.isPending &&
    (user || owner.ownerKind === "thumbnail")
  )
    return (
      <p role="status" className="p-5">
        이미지 불러오는 중...
      </p>
    );
  return (
    <Context.Provider value={query.data ?? null}>{children}</Context.Provider>
  );
}
export function useLegacyTemplateImages<T>(localImages: T): T {
  const runtime = useContext(Context);
  return useMemo(() => {
    if (!runtime || runtime.mode === "local") return localImages;
    return Object.fromEntries(
      Object.entries(runtime.images).map(([theme, slots]) => [
        theme,
        Object.fromEntries(
          Object.entries(slots).map(([key, image]) => [
            key,
            {
              ...(localImages as Record<string, Record<string, object>>)[
                theme
              ]?.[key],
              ...image,
            },
          ]),
        ),
      ]),
    ) as T;
  }, [localImages, runtime]);
}
