"use client";

import { toPng } from "html-to-image";
import { domToPng } from "modern-screenshot";
import { useCallback, useMemo, useRef, useState } from "react";

import { StudioWebFontLoader } from "@/components/studio/canvas/studio-web-font-loader";
import type { StudioTemplateDocument } from "@/types/template-studio";
import { parseStudioWebFontCss } from "@/utils/template-studio/web-fonts";

import {
  getSpikeEffectOutset,
  getSpikeStrokeBands,
  SPIKE_IMPORTED_FONT_CSS,
  SPIKE_SCENES,
  STUDIO_TEXT_STROKE_CSS_SCALE,
  toCssStrokeWidth,
  type SpikeScene,
} from "./spike-scenes";
import { SpikeText, type SpikeTextMeasurement } from "./spike-text";

type Rasterizer = "html-to-image" | "modern-screenshot";

interface SceneResult {
  busy?: boolean;
  error?: string;
  images: Partial<Record<Rasterizer, string>>;
  overlay: Rasterizer | "none";
}

const RASTERIZERS: Rasterizer[] = ["html-to-image", "modern-screenshot"];

const createSpikeDocument = (): StudioTemplateDocument => ({
  schema: "studio_template_document",
  version: 7,
  metadata: {
    editor: "template-studio",
    kind: "thumbnail",
    name: "Rendering Spike",
  },
  canvas: { width: 640, height: 360, background: "#ffffff" },
  graph: { rootNodeIds: [], nodes: {} },
  inputs: {},
  styles: {},
  assets: {},
  resources: {
    webFonts: [
      {
        id: "spike-escoredream",
        label: "Escoredream (noonnu)",
        cssText: SPIKE_IMPORTED_FONT_CSS,
        enabled: true,
      },
    ],
  },
});

export function RenderingSpikeClient() {
  const spikeDocument = useMemo(createSpikeDocument, []);
  const parsedFont = useMemo(
    () => parseStudioWebFontCss(SPIKE_IMPORTED_FONT_CSS),
    [],
  );
  const canvasRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [results, setResults] = useState<Record<string, SceneResult>>({});
  const [measurements, setMeasurements] = useState<
    Record<string, SpikeTextMeasurement>
  >({});

  const handleMeasure = useCallback(
    (sceneId: string, measurement: SpikeTextMeasurement) => {
      setMeasurements((current) => {
        const previous = current[sceneId];
        if (
          previous &&
          previous.fontSize === measurement.fontSize &&
          previous.lineCount === measurement.lineCount &&
          previous.contentHeight === measurement.contentHeight &&
          previous.fontsReady === measurement.fontsReady
        ) {
          return current;
        }
        return { ...current, [sceneId]: measurement };
      });
    },
    [],
  );

  const generate = useCallback(async (scene: SpikeScene) => {
    const element = canvasRefs.current[scene.id];
    if (!element) return;

    setResults((current) => ({
      ...current,
      [scene.id]: {
        images: current[scene.id]?.images ?? {},
        overlay: current[scene.id]?.overlay ?? "none",
        busy: true,
      },
    }));

    try {
      // 웹 폰트가 준비되기 전에 캡처하면 fallback 폰트가 결과로 굳는다.
      if (typeof window !== "undefined" && window.document.fonts) {
        await window.document.fonts.ready;
      }

      const background = scene.canvasBackground ?? undefined;

      const htmlToImageResult = await toPng(element, {
        backgroundColor: background,
        cacheBust: true,
        height: scene.canvas.height,
        pixelRatio: 1,
        width: scene.canvas.width,
      });

      const modernScreenshotResult = await domToPng(element, {
        backgroundColor: background,
        height: scene.canvas.height,
        scale: 1,
        width: scene.canvas.width,
      });

      setResults((current) => ({
        ...current,
        [scene.id]: {
          busy: false,
          images: {
            "html-to-image": htmlToImageResult,
            "modern-screenshot": modernScreenshotResult,
          },
          overlay: current[scene.id]?.overlay ?? "none",
        },
      }));
    } catch (error) {
      setResults((current) => ({
        ...current,
        [scene.id]: {
          busy: false,
          error: error instanceof Error ? error.message : String(error),
          images: current[scene.id]?.images ?? {},
          overlay: "none",
        },
      }));
    }
  }, []);

  const generateAll = useCallback(async () => {
    for (const scene of SPIKE_SCENES) {
      await generate(scene);
    }
  }, [generate]);

  const setOverlay = (sceneId: string, overlay: Rasterizer | "none") => {
    setResults((current) => ({
      ...current,
      [sceneId]: {
        images: current[sceneId]?.images ?? {},
        overlay,
        busy: current[sceneId]?.busy,
        error: current[sceneId]?.error,
      },
    }));
  };

  return (
    <main className="mx-auto flex max-w-[1600px] flex-col gap-8 p-8 text-slate-100">
      <StudioWebFontLoader document={spikeDocument} />

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">
          Phase 0A — 텍스트 효과와 PNG 렌더링 스파이크
        </h1>
        <p className="max-w-[900px] text-sm leading-relaxed text-slate-300">
          같은 DOM을 <code>html-to-image</code>와 <code>modern-screenshot</code>
          으로 각각 PNG로 만들고, 화면과 비교한다. 판정은 구조적 지표로 한다.
          안티에일리어싱 차이는 정상이므로 원시 픽셀 차이는 참고 지표로만 본다.
        </p>
        <p className="text-sm text-slate-400">
          지원 브라우저: Chrome · 테스트 환경: macOS · Windows 래스터화 차이는
          이 스파이크에서 확인하지 않는다.
        </p>
        <button
          className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
          onClick={() => void generateAll()}
          type="button"
        >
          모든 장면 PNG 생성
        </button>
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-lg font-bold">폰트 import 파서 확인</h2>
        <p className="mb-3 text-sm text-slate-300">
          눈누에서 복사한 형태의 CSS를 그대로 넣었다. 아래 정규화 결과에{" "}
          <code>ascent-override</code>, <code>descent-override</code>,{" "}
          <code>line-gap-override</code>, <code>size-adjust</code>가 자동으로
          주입됐는지 확인한다.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">
              입력 (오버라이드 없음)
            </h3>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">
              {SPIKE_IMPORTED_FONT_CSS}
            </pre>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">
              파서 정규화 결과 {parsedFont.ok ? "(ok)" : "(실패)"}
            </h3>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-300">
              {parsedFont.ok
                ? parsedFont.cssText
                : parsedFont.errors.map((item) => item.message).join("\n")}
            </pre>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          stroke 변환 상수: outset × {STUDIO_TEXT_STROKE_CSS_SCALE} = CSS stroke
          width
        </p>
      </section>

      {SPIKE_SCENES.map((scene) => {
        const result = results[scene.id];
        const measurement = measurements[scene.id];
        const bands = getSpikeStrokeBands(scene.strokes);
        const effectOutset = getSpikeEffectOutset(scene);
        const overlayImage =
          result?.overlay && result.overlay !== "none"
            ? result.images[result.overlay]
            : undefined;

        return (
          <section
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
            key={scene.id}
          >
            <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{scene.title}</h2>
                <p className="text-sm text-slate-400">{scene.verifies}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                  disabled={result?.busy}
                  onClick={() => void generate(scene)}
                  type="button"
                >
                  {result?.busy ? "생성 중..." : "PNG 생성"}
                </button>
                {(["none", ...RASTERIZERS] as const).map((option) => (
                  <button
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                      (result?.overlay ?? "none") === option
                        ? "border-blue-400 bg-blue-500/20 text-blue-200"
                        : "border-slate-600 hover:bg-slate-800"
                    }`}
                    disabled={option !== "none" && !result?.images[option]}
                    key={option}
                    onClick={() => setOverlay(scene.id, option)}
                    type="button"
                  >
                    {option === "none" ? "겹침 끄기" : `${option} 차이 겹침`}
                  </button>
                ))}
              </div>
            </header>

            {result?.error ? (
              <p className="mb-4 rounded-lg bg-red-950 p-3 text-sm text-red-300">
                생성 실패: {result.error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-6">
              <figure className="flex flex-col gap-2">
                <figcaption className="text-xs font-bold uppercase text-slate-400">
                  화면 (live DOM)
                  {overlayImage ? " + 차이 겹침" : ""}
                </figcaption>
                <div
                  className="relative shrink-0"
                  style={{
                    width: scene.canvas.width,
                    height: scene.canvas.height,
                    // 투명 배경 장면을 알아보기 위한 체커보드
                    backgroundImage:
                      scene.canvasBackground === null
                        ? "linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)"
                        : undefined,
                    backgroundSize:
                      scene.canvasBackground === null ? "16px 16px" : undefined,
                    backgroundPosition:
                      scene.canvasBackground === null
                        ? "0 0, 0 8px, 8px -8px, -8px 0px"
                        : undefined,
                  }}
                >
                  <div
                    className="absolute inset-0 overflow-hidden"
                    ref={(element) => {
                      canvasRefs.current[scene.id] = element;
                    }}
                    style={{
                      width: scene.canvas.width,
                      height: scene.canvas.height,
                      background: scene.canvasBackground ?? "transparent",
                    }}
                  >
                    <SpikeText
                      onMeasure={(value) => handleMeasure(scene.id, value)}
                      scene={scene}
                    />
                  </div>
                  {overlayImage ? (
                    // 완전히 일치하면 전체가 검정으로 보인다.
                    // eslint-disable-next-line @next/next/no-img-element -- 스파이크 전용 data URL 비교
                    <img
                      alt={`${scene.title} 차이 겹침`}
                      src={overlayImage}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: scene.canvas.width,
                        height: scene.canvas.height,
                        mixBlendMode: "difference",
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                </div>
              </figure>

              {RASTERIZERS.map((rasterizer) => {
                const image = result?.images[rasterizer];
                return (
                  <figure className="flex flex-col gap-2" key={rasterizer}>
                    <figcaption className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                      {rasterizer}
                      {image ? (
                        <a
                          className="rounded border border-slate-600 px-2 py-0.5 text-[10px] normal-case hover:bg-slate-800"
                          download={`${scene.id}-${rasterizer}.png`}
                          href={image}
                        >
                          다운로드
                        </a>
                      ) : null}
                    </figcaption>
                    <div
                      className="shrink-0 border border-dashed border-slate-700"
                      style={{
                        width: scene.canvas.width,
                        height: scene.canvas.height,
                      }}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 스파이크 전용 data URL 비교
                        <img
                          alt={`${scene.title} ${rasterizer}`}
                          src={image}
                          style={{
                            width: scene.canvas.width,
                            height: scene.canvas.height,
                          }}
                        />
                      ) : (
                        <p className="flex h-full items-center justify-center text-xs text-slate-500">
                          생성 전
                        </p>
                      )}
                    </div>
                  </figure>
                );
              })}

              <div className="min-w-[280px] flex-1 text-xs">
                <h3 className="mb-2 font-bold uppercase text-slate-400">
                  구조적 지표
                </h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-300">
                  <dt className="text-slate-500">폰트</dt>
                  <dd>
                    {scene.fontFamily} / {scene.fontWeight}
                  </dd>
                  <dt className="text-slate-500">크기 정책</dt>
                  <dd>
                    {scene.autoFit
                      ? `자동 (${scene.autoFit.min}~${scene.autoFit.max})`
                      : `고정 ${scene.fontSize}px`}
                  </dd>
                  <dt className="text-slate-500">측정 font size</dt>
                  <dd>{measurement ? `${measurement.fontSize}px` : "-"}</dd>
                  <dt className="text-slate-500">줄 높이</dt>
                  <dd>
                    {measurement
                      ? `${measurement.lineHeightPx.toFixed(2)}px (×${scene.lineHeight})`
                      : "-"}
                  </dd>
                  <dt className="text-slate-500">줄 수</dt>
                  <dd>{measurement ? measurement.lineCount : "-"}</dd>
                  <dt className="text-slate-500">콘텐츠 크기</dt>
                  <dd>
                    {measurement
                      ? `${measurement.contentWidth} × ${measurement.contentHeight}`
                      : "-"}
                  </dd>
                  <dt className="text-slate-500">폰트 준비</dt>
                  <dd>
                    {measurement
                      ? measurement.fontsReady
                        ? "완료 후 측정"
                        : "준비 전 측정"
                      : "-"}
                  </dd>
                  <dt className="text-slate-500">effect outset</dt>
                  <dd>
                    상 {effectOutset.top} / 우 {effectOutset.right} / 하{" "}
                    {effectOutset.bottom} / 좌 {effectOutset.left}
                  </dd>
                </dl>

                {bands.length > 0 ? (
                  <>
                    <h3 className="mb-2 mt-4 font-bold uppercase text-slate-400">
                      stroke 띠 두께
                    </h3>
                    <table className="w-full text-left text-slate-300">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="pr-2 font-medium">stroke</th>
                          <th className="pr-2 font-medium">outset</th>
                          <th className="pr-2 font-medium">CSS</th>
                          <th className="font-medium">보이는 띠</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bands.map(({ stroke, band, hidden }) => (
                          <tr key={stroke.id}>
                            <td className="pr-2">
                              <span
                                className="mr-1 inline-block h-2 w-2 rounded-sm align-middle"
                                style={{ background: stroke.color }}
                              />
                              {stroke.id}
                            </td>
                            <td className="pr-2">{stroke.outset}px</td>
                            <td className="pr-2">
                              {toCssStrokeWidth(stroke.outset)}px
                            </td>
                            <td className={hidden ? "text-red-400" : ""}>
                              {band}px{hidden ? " (가려짐)" : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-lg font-bold">판정 기준</h2>
        <ul className="flex flex-col gap-1.5 text-sm text-slate-300">
          <li>glyph 바운딩 박스 위치: 화면 대비 1px 이내</li>
          <li>줄 수와 줄바꿈 지점: 완전 일치</li>
          <li>측정 font size: 화면과 완전 일치</li>
          <li>stroke 실효 두께: 지정값의 ±10% 이내</li>
          <li>웹 폰트: fallback 발생 시 실패</li>
          <li>투명 배경: alpha 보존 여부 이진 판정</li>
          <li>
            원시 픽셀 차이: 참고 지표. 안티에일리어싱 차이는 합격 조건에서 제외
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-400">
          &ldquo;차이 겹침&rdquo;은 생성된 PNG를 화면 위에{" "}
          <code>mix-blend-mode: difference</code>로 올린다. 완전히 일치하면
          전체가 검정으로 보이고, 어긋나면 윤곽선이 드러난다.
        </p>
      </section>
    </main>
  );
}
