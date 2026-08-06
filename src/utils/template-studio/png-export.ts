import { domToPng } from "modern-screenshot";

const CSS_URL_PATTERN = /url\(\s*(["']?)(.*?)\1\s*\)/g;

interface ExportImageReference {
  label: string;
  source: string;
}

export class StudioPngExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudioPngExportError";
  }
}

export interface StudioPngExportOptions {
  width: number;
  height: number;
  pixelRatio: number;
  background: string | null;
  fileName: string;
}

export const sanitizeStudioExportFileName = (name: string): string =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ン一-龯_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "thumbnail";

export const buildStudioExportFileName = (
  templateName: string,
  now = new Date(),
): string => {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");
  return `${sanitizeStudioExportFileName(templateName)}-${date}-${time}.png`;
};

const normalizeImageSource = (source: string, baseURI: string): string => {
  const trimmed = source.trim();
  if (!trimmed || trimmed === "none" || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("#")) return trimmed;

  try {
    return new URL(trimmed, baseURI).href;
  } catch {
    return trimmed;
  }
};

const collectCssImageSources = (cssValue: string, baseURI: string): string[] =>
  [...cssValue.matchAll(CSS_URL_PATTERN)]
    .map((match) => normalizeImageSource(match[2], baseURI))
    .filter(
      (source) =>
        Boolean(source) &&
        source !== "none" &&
        !source.startsWith("data:") &&
        !source.startsWith("#"),
    );

const collectExportImageReferences = (
  element: HTMLElement,
): ExportImageReference[] => {
  const baseURI = element.ownerDocument.baseURI;
  const references: ExportImageReference[] = [];
  const seen = new Set<string>();

  const add = (source: string | null | undefined, label: string) => {
    const normalized = normalizeImageSource(source ?? "", baseURI);
    if (
      !normalized ||
      normalized === "none" ||
      normalized.startsWith("data:") ||
      normalized.startsWith("#") ||
      seen.has(normalized)
    ) {
      return;
    }
    seen.add(normalized);
    references.push({ label, source: normalized });
  };

  element.querySelectorAll("img").forEach((image) => {
    add(
      image.currentSrc || image.getAttribute("src") || image.src,
      image.alt || "image",
    );
  });

  element.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
    const inlineStyle = node.getAttribute("style") ?? "";
    collectCssImageSources(inlineStyle, baseURI).forEach((source) =>
      add(source, "background image"),
    );

    const computedStyle = window.getComputedStyle(node);
    for (let index = 0; index < computedStyle.length; index += 1) {
      const property = computedStyle.item(index);
      collectCssImageSources(
        computedStyle.getPropertyValue(property),
        baseURI,
      ).forEach((source) => add(source, "background image"));
    }
  });

  return references;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Image blob was not converted to a data URL."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject(new Error("Image blob read was aborted."));
    reader.readAsDataURL(blob);
  });

export const preloadStudioExportImages = async (
  element: HTMLElement,
): Promise<Map<string, string>> => {
  const references = collectExportImageReferences(element);
  const embeddedImages = new Map<string, string>();

  await Promise.all(
    references.map(async ({ label, source }) => {
      try {
        const response = await window.fetch(source, {
          cache: "no-store",
          credentials: "same-origin",
          mode: "cors",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (blob.type && !blob.type.startsWith("image/")) {
          throw new Error(`Unexpected content type: ${blob.type}`);
        }
        embeddedImages.set(source, await blobToDataUrl(blob));
      } catch {
        throw new StudioPngExportError(
          `PNG에 필요한 ${label}을(를) 불러오지 못했습니다. 다시 시도해 주세요.`,
        );
      }
    }),
  );

  return embeddedImages;
};

const rewriteCssImageSources = (
  cssValue: string,
  embeddedImages: Map<string, string>,
  baseURI: string,
): string =>
  cssValue.replace(
    CSS_URL_PATTERN,
    (match, _quote: string, rawSource: string) => {
      const normalized = normalizeImageSource(rawSource, baseURI);
      if (
        !normalized ||
        normalized === "none" ||
        normalized.startsWith("data:") ||
        normalized.startsWith("#")
      ) {
        return match;
      }

      const embedded = embeddedImages.get(normalized);
      if (!embedded) {
        throw new StudioPngExportError(
          "PNG에 필요한 이미지 임베딩에 실패했습니다. 다시 시도해 주세요.",
        );
      }
      return `url(${JSON.stringify(embedded)})`;
    },
  );

const rewriteCloneNode = (
  cloned: Node,
  embeddedImages: Map<string, string>,
  baseURI: string,
) => {
  if (!(cloned instanceof Element)) return;

  if (cloned instanceof HTMLImageElement) {
    const source = normalizeImageSource(
      cloned.currentSrc || cloned.getAttribute("src") || cloned.src,
      baseURI,
    );
    cloned.srcset = "";
    if (source && !source.startsWith("data:")) {
      const embedded = embeddedImages.get(source);
      if (!embedded) {
        throw new StudioPngExportError(
          `PNG에 필요한 ${cloned.alt || "image"}을(를) 임베딩하지 못했습니다. 다시 시도해 주세요.`,
        );
      }
      cloned.src = embedded;
    }
  }

  const style = cloned.getAttribute("style");
  if (style?.includes("url(")) {
    cloned.setAttribute(
      "style",
      rewriteCssImageSources(style, embeddedImages, baseURI),
    );
  }
};

export const exportStudioPng = async (
  element: HTMLElement,
  options: StudioPngExportOptions,
): Promise<void> => {
  const embeddedImages = await preloadStudioExportImages(element);
  const baseURI = element.ownerDocument.baseURI;
  const dataUrl = await domToPng(element, {
    fetch: {
      bypassingCache: true,
      placeholderImage: "",
      requestInit: {
        cache: "no-store",
        credentials: "same-origin",
        mode: "cors",
      },
    },
    fetchFn: async (source) =>
      embeddedImages.get(normalizeImageSource(source, baseURI)) ?? false,
    height: options.height,
    onCloneNode: (cloned) => rewriteCloneNode(cloned, embeddedImages, baseURI),
    scale: options.pixelRatio,
    style: {
      background: options.background ?? "transparent",
      transform: "none",
    },
    width: options.width,
  });

  const link = window.document.createElement("a");
  link.download = options.fileName;
  link.href = dataUrl;
  link.click();
};
