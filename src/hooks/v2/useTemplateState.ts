"use client";

import { CroppedAreaPixels, ImageEditData } from "@/types/image-edit";
import { pageAwareStorage } from "@/utils/pageAwareLocalStorage";
import { domToPng } from "modern-screenshot";
import { useEffect, useState } from "react";

export type V2OptionType = "profile" | "memo" | "none";

const getDefaultMondayString = (): string => {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
};

const getThisWeekDatesFromMonday = (monday: Date): Date[] => {
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
};

const getInitialScale = (templateWidth?: number, templateHeight?: number) => {
  if (typeof window === "undefined") {
    return 0.5;
  }

  const isMobile = window.innerWidth < 768;

  if (!templateWidth || !templateHeight) {
    return isMobile ? 0.3 : 0.5;
  }

  const availableWidth = isMobile
    ? window.innerWidth - 32
    : window.innerWidth * 0.75 - 64;

  const availableHeight = isMobile
    ? window.innerHeight * 0.3 - 32
    : window.innerHeight - 120;

  const scaleByWidth = availableWidth / templateWidth;
  const scaleByHeight = availableHeight / templateHeight;
  const calculatedScale = Math.min(scaleByWidth, scaleByHeight);
  const clampedScale = Math.max(0.1, Math.min(calculatedScale, 1.0));

  return clampedScale;
};

export interface TemplateEditorUIState {
  profileText: string;
  memoText: string;
  imageSrc: string | null;
  preferProfileDummyImage: boolean;
  imageEditData: ImageEditData | null;
  mondayDateStr: string;
  weekDates: Date[];
  scale: number;
  isMobile: boolean;
  isProfileTextVisible: boolean;
  isMemoTextVisible: boolean;
  selectedOptions: V2OptionType[];
  captureSize: { width: number; height: number } | undefined;
}

export interface TemplateEditorUIActions {
  updateProfileText: (text: string) => void;
  updateMemoText: (text: string) => void;
  updateImageSrc: (src: string | null) => void;
  updatePreferProfileDummyImage: (value: boolean) => void;
  updateMondayDate: (dateStr: string) => void;
  updateScale: (newScale: number) => void;
  updateIsMobile: (mobile: boolean) => void;
  updateIsProfileTextVisible: (visible: boolean) => void;
  updateIsMemoTextVisible: (visible: boolean) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileTextChange: (text: string) => void;
  handleMemoTextChange: (text: string) => void;
  handleDateChange: (dateStr: string) => void;
  handleOptionClick: (option: V2OptionType, multiSelect?: boolean) => void;
  updateImageEditData: (data: Partial<ImageEditData>) => void;
  setOriginalImage: (
    imageSrc: string,
    cropWidth?: number,
    cropHeight?: number
  ) => void;
  saveCroppedImage: (
    croppedImageSrc: string,
    croppedAreaPixels: CroppedAreaPixels
  ) => void;
  updateEditProgress: (
    crop: { x: number; y: number },
    zoom: number,
    rotation: number
  ) => void;
  resetImageEditData: () => void;
  startEditMode: () => ImageEditData | null;
  downloadImage: (targetWidth: number, targetHeight: number) => Promise<void>;
}

export const useTemplateState = (captureSize?: {
  width: number;
  height: number;
}) => {
  const [profileText, setProfileText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("profileText", "");
    }
    return "";
  });
  const [memoText, setMemoText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("memoText", "");
    }
    return "";
  });
  const [imageSrc, setImageSrc] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("imageSrc", null);
    }
    return null;
  });
  const [preferProfileDummyImage, setPreferProfileDummyImage] = useState<boolean>(
    () => {
      if (typeof window !== "undefined") {
        return pageAwareStorage.getItem("preferProfileDummyImage", false);
      }
      return false;
    }
  );
  const [isProfileTextVisible, setIsProfileTextVisible] = useState<boolean>(
    () => {
      if (typeof window !== "undefined") {
        return pageAwareStorage.getItem("isProfileTextVisible", true);
      }
      return true;
    }
  );
  const [isMemoTextVisible, setIsMemoTextVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("isMemoTextVisible", true);
    }
    return true;
  });
  const [selectedOptions, setSelectedOptions] = useState<V2OptionType[]>(() => {
    if (typeof window !== "undefined") {
      return pageAwareStorage.getItem("selectedOptions", ["none"]);
    }
    return ["none"];
  });

  const [imageEditData, setImageEditData] = useState<ImageEditData | null>(
    () => {
      if (typeof window !== "undefined") {
        return pageAwareStorage.getItem("imageEditData", null);
      }
      return null;
    }
  );

  const [mondayDateStr, setMondayDateStr] = useState<string>(
    getDefaultMondayString()
  );
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [scale, setScale] = useState(() =>
    getInitialScale(captureSize?.width, captureSize?.height)
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const monday = new Date(mondayDateStr);
    setWeekDates(getThisWeekDatesFromMonday(monday));
  }, [mondayDateStr]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("profileText", profileText);
    }
  }, [profileText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("memoText", memoText);
    }
  }, [memoText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (imageSrc) {
        pageAwareStorage.setItem("imageSrc", imageSrc);
      } else {
        pageAwareStorage.removeItem("imageSrc");
      }
    }
  }, [imageSrc]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem(
        "preferProfileDummyImage",
        preferProfileDummyImage
      );
    }
  }, [preferProfileDummyImage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("isProfileTextVisible", isProfileTextVisible);
    }
  }, [isProfileTextVisible]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("isMemoTextVisible", isMemoTextVisible);
    }
  }, [isMemoTextVisible]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pageAwareStorage.setItem("selectedOptions", selectedOptions);
    }
  }, [selectedOptions]);

  useEffect(() => {
    const hasProfile = selectedOptions.includes("profile");
    const hasMemo = selectedOptions.includes("memo");

    setIsProfileTextVisible(hasProfile);
    setIsMemoTextVisible(hasMemo);
  }, [selectedOptions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (imageEditData) {
        pageAwareStorage.setItem("imageEditData", imageEditData);
      } else {
        pageAwareStorage.removeItem("imageEditData");
      }
    }
  }, [imageEditData]);

  useEffect(() => {
    const getDefaultMondayStringLocal = (): string => {
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday + 1);
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split("T")[0];
    };

    setMondayDateStr(getDefaultMondayStringLocal());
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isCurrentlyMobile = window.innerWidth < 768;
      if (isCurrentlyMobile === isMobile) {
        return;
      }

      setIsMobile(isCurrentlyMobile);

      const newOptimalScale = getInitialScale(
        captureSize?.width,
        captureSize?.height
      );
      setScale((prevScale) => {
        if (isCurrentlyMobile) {
          return Math.min(newOptimalScale, 1.0);
        }
        return Math.max(0.1, Math.min(prevScale, 2.0));
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [captureSize, isMobile]);

  const actions: TemplateEditorUIActions = {
    updateProfileText: (text: string) => setProfileText(text),
    updateMemoText: (text: string) => setMemoText(text),
    updateImageSrc: (src: string | null) => setImageSrc(src),
    updatePreferProfileDummyImage: (value: boolean) =>
      setPreferProfileDummyImage(value),
    updateMondayDate: (dateStr: string) => setMondayDateStr(dateStr),
    updateScale: (newScale: number) => setScale(newScale),
    updateIsMobile: (mobile: boolean) => setIsMobile(mobile),
    updateIsProfileTextVisible: (visible: boolean) =>
      setIsProfileTextVisible(visible),
    updateIsMemoTextVisible: (visible: boolean) =>
      setIsMemoTextVisible(visible),

    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isPNG = file.type === "image/png";

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        if (isPNG) {
          setImageSrc(result);
        } else {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              setImageSrc(result);
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL("image/png");
            setImageSrc(pngDataUrl);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    },

    handleProfileTextChange: (text: string) => {
      setProfileText(text);
    },
    handleMemoTextChange: (text: string) => {
      setMemoText(text);
    },
    handleDateChange: (dateStr: string) => {
      setMondayDateStr(dateStr);
    },

    handleOptionClick: (
      option: V2OptionType,
      multiSelect: boolean = false
    ) => {
      setSelectedOptions((prev) => {
        if (multiSelect) {
          if (option === "none") {
            return ["none"];
          }
          if (prev.includes(option)) {
            const filtered = prev.filter((opt) => opt !== option);
            return filtered.length === 0 ? ["none"] : filtered;
          }
          const withoutNone = prev.filter((opt) => opt !== "none");
          return [...withoutNone, option];
        }
        if (prev.includes(option)) {
          return ["none"];
        }
        return [option];
      });
    },

    updateImageEditData: (data: Partial<ImageEditData>) => {
      setImageEditData((prev) => (prev ? { ...prev, ...data } : null));
    },

    setOriginalImage: (
      imageSrcValue: string,
      cropWidth = 400,
      cropHeight = 400
    ) => {
      const newImageEditData: ImageEditData = {
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        originalImageSrc: imageSrcValue,
        croppedImageSrc: null,
        cropWidth,
        cropHeight,
        aspectRatio: cropWidth / cropHeight,
      };
      setImageEditData(newImageEditData);
    },

    saveCroppedImage: (
      croppedImageSrc: string,
      croppedAreaPixels: CroppedAreaPixels
    ) => {
      setImageEditData((prev) =>
        prev
          ? {
              ...prev,
              croppedImageSrc,
              croppedAreaPixels,
            }
          : null
      );
    },

    updateEditProgress: (
      crop: { x: number; y: number },
      zoom: number,
      rotation: number
    ) => {
      setImageEditData((prev) =>
        prev
          ? {
              ...prev,
              crop,
              zoom,
              rotation,
            }
          : null
      );
    },

    resetImageEditData: () => {
      setImageEditData(null);
    },

    startEditMode: (): ImageEditData | null => {
      return imageEditData;
    },

    downloadImage: async (targetWidth: number, targetHeight: number) => {
      const node = document.getElementById("timetable");
      if (!node) return;

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const fileName = `timetable_${year}${month}${day}${hours}${minutes}${seconds}_${targetWidth}x${targetHeight}.png`;

        const templateWidth = captureSize?.width || 1280;
        const templateHeight = captureSize?.height || 720;

        const originalTransform = node.style.transform;
        const originalWidth = node.style.width;
        const originalHeight = node.style.height;

        node.style.transform = "scale(1)";
        node.style.width = `${templateWidth}px`;
        node.style.height = `${templateHeight}px`;
        node.style.transformOrigin = "top left";

        await new Promise((resolve) => setTimeout(resolve, 100));

        const originalDataUrl = await domToPng(node, {
          width: templateWidth,
          height: templateHeight,
          quality: 1,
          backgroundColor: "transparent",
        });

        node.style.transform = originalTransform;
        node.style.width = originalWidth;
        node.style.height = originalHeight;

        if (targetWidth === templateWidth && targetHeight === templateHeight) {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = originalDataUrl;
          link.click();
        } else {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) return;

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            canvas.toBlob(
              (blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
              },
              "image/png",
              1
            );
          };
          img.src = originalDataUrl;
        }
      } catch (err) {
        console.error("이미지 생성 실패:", err);
        const node = document.getElementById("timetable");
        if (node) {
          node.style.transform = `scale(${scale})`;
          node.style.width = "";
          node.style.height = "";
        }
      }
    },
  };

  const state: TemplateEditorUIState = {
    profileText,
    memoText,
    imageSrc,
    preferProfileDummyImage,
    imageEditData,
    mondayDateStr,
    weekDates,
    scale,
    isMobile,
    isProfileTextVisible,
    isMemoTextVisible,
    selectedOptions,
    captureSize,
  };

  return { state, actions };
};
