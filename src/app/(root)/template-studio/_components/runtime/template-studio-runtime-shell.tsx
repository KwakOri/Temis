"use client";

import { domToPng } from "modern-screenshot";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  getStudioRuntimeCopy,
  isStudioRuntimeLocale,
  normalizeStudioRuntimeLocale,
  STUDIO_RUNTIME_LOCALE_COOKIE_KEY,
  STUDIO_RUNTIME_LOCALE_OPTIONS,
  STUDIO_RUNTIME_LOCALE_STORAGE_KEY,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import { StudioRuntimePreviewWorkspace } from "@/components/studio/runtime/studio-runtime-preview-workspace";
import { useStudioRuntimeViewport } from "@/components/studio/runtime/use-studio-runtime-viewport";
import {
  getStudioTimetablePreviewSize,
  StudioTimetablePreview,
} from "../studio-timetable-preview";
import { TemplateStudioRuntimeForm } from "./template-studio-runtime-form";

interface TemplateStudioRuntimeShellProps {
  document: StudioTemplateDocument;
  initialRuntimeValues: StudioRuntimeValues;
  source: "draft" | "published";
  templateId?: string | null;
  templateName?: string;
  updatedAt?: string | null;
  backHref?: string;
  /** When provided, the form shows a "저장" action that persists runtimeValues (user-run mode). */
  onSaveValues?: (runtimeValues: StudioRuntimeValues) => Promise<void>;
  /** Stable identity for this browser's local (IndexedDB) runtime image storage. User-run mode only. */
  storageOwnerId?: string | null;
}

const cloneRuntimeValues = (
  runtimeValues: StudioRuntimeValues,
): StudioRuntimeValues =>
  JSON.parse(JSON.stringify(runtimeValues)) as StudioRuntimeValues;

export function TemplateStudioRuntimeShell({
  document,
  initialRuntimeValues,
  templateId,
  templateName,
  backHref: backHrefProp,
  onSaveValues,
  storageOwnerId,
}: TemplateStudioRuntimeShellProps) {
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [runtimeValues, setRuntimeValues] = useState<StudioRuntimeValues>(() =>
    cloneRuntimeValues(initialRuntimeValues),
  );
  const [locale, setLocale] = useState<StudioRuntimeLocale>("en");
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isSavingValues, setIsSavingValues] = useState(false);
  const timetable = document.domains?.timetable;
  const copy = getStudioRuntimeCopy(locale);
  const previewSize = useMemo(
    () =>
      timetable
        ? getStudioTimetablePreviewSize(timetable)
        : {
            width: document.canvas.width,
            height: document.canvas.height,
          },
    [document.canvas.height, document.canvas.width, timetable],
  );
  const viewport = useStudioRuntimeViewport(previewSize);

  const displayName =
    templateName?.trim() || document.metadata.name || "Template Studio Preview";
  const backHref =
    backHrefProp ??
    (templateId
      ? `/admin/template-studio/${templateId}/edit`
      : "/admin/template-studio");

  useEffect(() => {
    const queryLocale = new URLSearchParams(window.location.search).get("lang");
    if (isStudioRuntimeLocale(queryLocale)) {
      setLocale(queryLocale);
      return;
    }

    let storedLocale: string | null = null;
    try {
      storedLocale = window.localStorage.getItem(
        STUDIO_RUNTIME_LOCALE_STORAGE_KEY,
      );
    } catch {
      storedLocale = null;
    }

    if (isStudioRuntimeLocale(storedLocale)) {
      setLocale(storedLocale);
      return;
    }

    let cookieLocale: string | undefined;
    try {
      cookieLocale = (
        typeof window.document.cookie === "string" ? window.document.cookie : ""
      )
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${STUDIO_RUNTIME_LOCALE_COOKIE_KEY}=`))
        ?.split("=")[1];
    } catch {
      cookieLocale = undefined;
    }
    if (isStudioRuntimeLocale(cookieLocale)) {
      setLocale(cookieLocale);
      return;
    }

    const browserLocale =
      window.navigator.languages?.[0] ?? window.navigator.language;
    setLocale(normalizeStudioRuntimeLocale(browserLocale));
  }, []);

  useEffect(() => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
  }, [initialRuntimeValues]);

  const resetRuntimeValues = () => {
    setRuntimeValues(cloneRuntimeValues(initialRuntimeValues));
  };

  const updateLocale = (nextLocale: StudioRuntimeLocale) => {
    setLocale(nextLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState(null, "", url);
    try {
      window.localStorage.setItem(
        STUDIO_RUNTIME_LOCALE_STORAGE_KEY,
        nextLocale,
      );
    } catch {
      // A blocked storage API must not prevent changing the active UI locale.
    }
    try {
      window.document.cookie = `${STUDIO_RUNTIME_LOCALE_COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // URL state remains available when cookies are blocked.
    }
  };

  const savePreviewImage = useCallback(async () => {
    const element = previewContentRef.current;
    if (!element || isSavingImage) return;

    setIsSavingImage(true);
    try {
      // 폰트가 준비되기 전에 캡처하면 fallback 폰트가 결과 이미지에 굳는다. 화면에는
      // 제대로 보이므로 사용자는 내려받은 파일을 열어 보고서야 알게 된다.
      if (window.document.fonts) {
        await window.document.fonts.ready;
      }

      /**
       * 래스터라이저는 `modern-screenshot` 하나로 둔다.
       *
       * Phase 0A 스파이크가 표준으로 정한 것이고, 시간표 카드와 같은 조건으로 재 봤을 때
       * `html-to-image`보다 화면과 더 잘 맞거나 같았다. 어긋난 장면은 자동 크기 글자가
       * 상자 높이를 거의 채우는 쪽이었다. 두 줄짜리 제목과 높이가 빡빡한 부제목이다.
       * 화면에서는 아무 문제가 없고 내려받은 파일에서만 드러나므로 눈에 띄기까지 오래 걸린다.
       *
       * 옵션 대응: `pixelRatio` → `scale`, `cacheBust` → `fetch.bypassingCache`.
       */
      const dataUrl = await domToPng(element, {
        fetch: { bypassingCache: true },
        height: previewSize.height,
        scale: 1,
        style: {
          transform: "none",
        },
        width: previewSize.width,
      });
      const safeName =
        displayName
          .trim()
          .replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ン一-龯_-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "timetable";
      const link = window.document.createElement("a");
      link.download = `${safeName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Template Studio preview image export failed", error);
      window.alert(copy.saveImageFailed);
    } finally {
      setIsSavingImage(false);
    }
  }, [
    copy.saveImageFailed,
    displayName,
    isSavingImage,
    previewSize.height,
    previewSize.width,
  ]);

  const saveValues = useCallback(async () => {
    if (!onSaveValues || isSavingValues) return;

    setIsSavingValues(true);
    try {
      await onSaveValues(runtimeValues);
    } catch (error) {
      console.error("Template Studio runtime value save failed", error);
      window.alert(copy.saveFailed);
    } finally {
      setIsSavingValues(false);
    }
  }, [copy.saveFailed, isSavingValues, onSaveValues, runtimeValues]);

  return (
    <main
      className="studio-runtime-theme template-studio-runtime-theme flex h-screen w-full flex-col overflow-hidden bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)]"
      lang={locale}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-center">
        <StudioRuntimePreviewWorkspace
          backHref={backHref}
          backLabel={copy.back}
          contentRef={previewContentRef}
          languageControl={
            <select
              aria-label={copy.language}
              className="hidden h-8 shrink-0 rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-2 text-xs font-bold text-[var(--runtime-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--runtime-focus)] sm:block"
              value={locale}
              onChange={(event) =>
                updateLocale(event.currentTarget.value as StudioRuntimeLocale)
              }
            >
              {STUDIO_RUNTIME_LOCALE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          }
          previewAreaTestId="template-studio-preview-area"
          previewSize={previewSize}
          scaleLabel={copy.previewScale}
          scaleInputId="template-studio-preview-scale"
          viewport={viewport}
        >
          {timetable ? (
            <StudioTimetablePreview
              document={document}
              runtimeValues={runtimeValues}
            />
          ) : (
            <StudioRenderer document={document} runtimeValues={runtimeValues} />
          )}
        </StudioRuntimePreviewWorkspace>

        <TemplateStudioRuntimeForm
          document={document}
          isSavingImage={isSavingImage}
          isSavingValues={isSavingValues}
          locale={locale}
          runtimeValues={runtimeValues}
          setRuntimeValues={setRuntimeValues}
          storageOwnerId={storageOwnerId}
          templateId={templateId}
          onReset={resetRuntimeValues}
          onSaveImage={() => {
            void savePreviewImage();
          }}
          onSaveValues={
            onSaveValues
              ? () => {
                  void saveValues();
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}
