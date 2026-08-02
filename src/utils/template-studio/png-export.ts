import { domToPng } from "modern-screenshot";

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

export const exportStudioPng = async (
  element: HTMLElement,
  options: StudioPngExportOptions,
): Promise<void> => {
  const dataUrl = await domToPng(element, {
    fetch: { bypassingCache: true },
    height: options.height,
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
