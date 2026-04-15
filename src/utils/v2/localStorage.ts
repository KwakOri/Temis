import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";

const isClient = typeof window !== "undefined";
const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCurrentVersion = (): string => {
  return (
    process.env.NEXT_PUBLIC_V2_DATA_VERSION ||
    process.env.NEXT_PUBLIC_DATA_VERSION ||
    "1.0.0"
  );
};

const v2_extractTemplateIdFromPath = (pathname: string): string | null => {
  const runtimeMatch = pathname.match(/\/v2-template\/([^\/]+)/);
  if (runtimeMatch?.[1] && v2_TEMPLATE_ID_REGEX.test(runtimeMatch[1])) {
    return runtimeMatch[1];
  }

  const adminEditMatch = pathname.match(
    /\/admin\/template-editor\/([^\/]+)\/edit/
  );
  if (adminEditMatch?.[1] && v2_TEMPLATE_ID_REGEX.test(adminEditMatch[1])) {
    return adminEditMatch[1];
  }

  const legacyEditMatch = pathname.match(/\/template-editor\/([^\/]+)\/edit/);
  if (legacyEditMatch?.[1] && v2_TEMPLATE_ID_REGEX.test(legacyEditMatch[1])) {
    return legacyEditMatch[1];
  }

  return null;
};

const v2_extractTemplateIdFromSearch = (search: string): string | null => {
  try {
    const params = new URLSearchParams(search);
    const templateId = params.get("templateId");
    if (templateId && v2_TEMPLATE_ID_REGEX.test(templateId)) {
      return templateId;
    }
    return null;
  } catch {
    return null;
  }
};

export const getV2PageId = (
  pathname?: string,
  search?: string
): string => {
  if (!isClient && !pathname && !search) return "v2-default";

  const currentPath = pathname || (isClient ? window.location.pathname : "");
  const currentSearch = search || (isClient ? window.location.search : "");

  const idFromPath = v2_extractTemplateIdFromPath(currentPath);
  if (idFromPath) return `v2-${idFromPath}`;

  const idFromSearch = v2_extractTemplateIdFromSearch(currentSearch);
  if (idFromSearch) return `v2-${idFromSearch}`;

  if (currentPath.startsWith("/v2-template")) return "v2-template-root";
  if (currentPath.startsWith("/admin/template-editor")) return "v2-admin-editor";

  return "v2-default";
};

export const createV2PageAwareKey = (baseKey: string, pageId?: string) => {
  const resolvedPageId = pageId || getV2PageId();
  return `${baseKey}-${resolvedPageId}`;
};

const setV2Item = <T>(key: string, data: T): boolean => {
  if (!isClient) return false;
  try {
    const pageAwareKey = createV2PageAwareKey(key);
    localStorage.setItem(pageAwareKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn(`[v2-storage] failed to set key=${key}`, error);
    return false;
  }
};

const getV2Item = <T>(key: string, defaultValue: T): T => {
  if (!isClient) return defaultValue;
  try {
    const pageAwareKey = createV2PageAwareKey(key);
    const raw = localStorage.getItem(pageAwareKey);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[v2-storage] failed to get key=${key}`, error);
    return defaultValue;
  }
};

const removeV2Item = (key: string): boolean => {
  if (!isClient) return false;
  try {
    const pageAwareKey = createV2PageAwareKey(key);
    localStorage.removeItem(pageAwareKey);
    return true;
  } catch (error) {
    console.warn(`[v2-storage] failed to remove key=${key}`, error);
    return false;
  }
};

const getAllV2KeysForCurrentPage = (): string[] => {
  if (!isClient) return [];
  const pageId = getV2PageId();
  const suffix = `-${pageId}`;
  return Object.keys(localStorage)
    .filter((storageKey) => storageKey.endsWith(suffix))
    .map((storageKey) => storageKey.slice(0, -suffix.length));
};

const clearV2PageData = (): boolean => {
  if (!isClient) return false;
  try {
    const keys = getAllV2KeysForCurrentPage();
    keys.forEach((key) => {
      localStorage.removeItem(createV2PageAwareKey(key));
    });
    return true;
  } catch (error) {
    console.warn("[v2-storage] failed to clear current page data", error);
    return false;
  }
};

export const v2StateStorage = {
  getItem: getV2Item,
  setItem: setV2Item,
  removeItem: removeV2Item,
  getPageId: getV2PageId,
  clearPageData: clearV2PageData,
};

export const STORAGE_KEYS = {
  TIMETABLE_DATA: "v2-template-timetable-data",
  GLOBAL_DATA: "v2-template-global-data",
  THEME: "v2-template-theme",
  VERSION: "v2-template-version",
} as const;

export const clearAllTimeTableStorage = (): boolean => {
  return clearV2PageData();
};

const checkVersionAndClearIfNeeded = (): boolean => {
  const currentVersion = getCurrentVersion();
  const storedVersion = getV2Item<string | null>(STORAGE_KEYS.VERSION, null);

  if (storedVersion === currentVersion) {
    return false;
  }

  removeV2Item(STORAGE_KEYS.TIMETABLE_DATA);
  removeV2Item(STORAGE_KEYS.GLOBAL_DATA);
  removeV2Item(STORAGE_KEYS.THEME);
  setV2Item(STORAGE_KEYS.VERSION, currentVersion);
  return true;
};

export const timeTableStorage = {
  saveData: (data: TDefaultCard[]): boolean => {
    const success = setV2Item(STORAGE_KEYS.TIMETABLE_DATA, data);
    if (success) {
      setV2Item(STORAGE_KEYS.VERSION, getCurrentVersion());
    }
    return success;
  },

  loadData: (defaultData: TDefaultCard[]): TDefaultCard[] => {
    checkVersionAndClearIfNeeded();
    return getV2Item(STORAGE_KEYS.TIMETABLE_DATA, defaultData);
  },

  saveTheme: (theme: TTheme): boolean => {
    return setV2Item(STORAGE_KEYS.THEME, theme);
  },

  saveGlobalData: (globalData: TGlobalData): boolean => {
    return setV2Item(STORAGE_KEYS.GLOBAL_DATA, globalData);
  },

  loadTheme: (defaultTheme: TTheme): TTheme => {
    checkVersionAndClearIfNeeded();
    return getV2Item(STORAGE_KEYS.THEME, defaultTheme);
  },

  loadGlobalData: (defaultGlobalData: TGlobalData): TGlobalData => {
    checkVersionAndClearIfNeeded();
    return getV2Item(STORAGE_KEYS.GLOBAL_DATA, defaultGlobalData);
  },

  validateData: (data: TDefaultCard[]): boolean => {
    if (!Array.isArray(data)) return false;
    if (data.length !== 7) return false;

    return data.every((card, index) => {
      return (
        typeof card === "object" &&
        card !== null &&
        typeof card.day === "number" &&
        card.day === index &&
        typeof card.isOffline === "boolean" &&
        Array.isArray(card.entries) &&
        card.entries.length > 0 &&
        card.entries.every(
          (entry) => typeof entry === "object" && entry !== null
        )
      );
    });
  },

  loadDataSafely: (defaultData: TDefaultCard[]): TDefaultCard[] => {
    const data = timeTableStorage.loadData(defaultData);
    if (timeTableStorage.validateData(data)) {
      return data;
    }
    console.warn("[v2-storage] invalid persisted data. using defaults.");
    return defaultData;
  },
};

export const createAutoSave = (
  saveFunction: () => void,
  delay: number = 1000
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      saveFunction();
      timeoutId = null;
    }, delay);
  };
};
