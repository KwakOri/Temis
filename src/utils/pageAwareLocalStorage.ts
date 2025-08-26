import { usePathname } from "next/navigation";
import { useMemo } from "react";

// 브라우저 환경 체크
const isClient = typeof window !== "undefined";

/**
 * 현재 페이지의 고유 ID를 추출하는 함수
 * - /time-table/[pageId] 형태에서 pageId를 추출
 * - _template 페이지는 "template"로 처리
 */
export const getPageId = (pathname?: string): string => {
  if (!isClient && !pathname) return "default";
  
  const currentPath = pathname || (isClient ? window.location.pathname : "");
  const timeTableMatch = currentPath.match(/\/time-table\/([^\/]+)/);
  
  if (timeTableMatch && timeTableMatch[1]) {
    const pageId = timeTableMatch[1];
    // _template 경로는 "template"로 정규화
    return pageId === "_template" ? "template" : pageId;
  }
  
  return "default";
};

/**
 * 페이지별로 고유한 localStorage 키를 생성하는 함수
 */
export const createPageAwareKey = (baseKey: string, pageId?: string): string => {
  const currentPageId = pageId || getPageId();
  return `${baseKey}-${currentPageId}`;
};

/**
 * 페이지별 localStorage 관리 클래스
 */
class PageAwareLocalStorage {
  private pageId: string;

  constructor(pageId?: string) {
    this.pageId = pageId || getPageId();
  }

  /**
   * 페이지별 고유 키로 데이터 저장
   */
  setItem<T>(key: string, data: T): boolean {
    if (!isClient) return false;

    try {
      const pageAwareKey = createPageAwareKey(key, this.pageId);
      const serializedData = JSON.stringify(data);
      localStorage.setItem(pageAwareKey, serializedData);
      return true;
    } catch (error) {
      console.warn(`Failed to save to localStorage (key: ${key}, pageId: ${this.pageId}):`, error);
      return false;
    }
  }

  /**
   * 페이지별 고유 키로 데이터 로드
   */
  getItem<T>(key: string, defaultValue: T): T {
    if (!isClient) return defaultValue;

    try {
      const pageAwareKey = createPageAwareKey(key, this.pageId);
      const serializedData = localStorage.getItem(pageAwareKey);
      
      if (serializedData === null) return defaultValue;
      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.warn(`Failed to load from localStorage (key: ${key}, pageId: ${this.pageId}):`, error);
      return defaultValue;
    }
  }

  /**
   * 페이지별 데이터 삭제
   */
  removeItem(key: string): boolean {
    if (!isClient) return false;

    try {
      const pageAwareKey = createPageAwareKey(key, this.pageId);
      localStorage.removeItem(pageAwareKey);
      return true;
    } catch (error) {
      console.warn(`Failed to remove from localStorage (key: ${key}, pageId: ${this.pageId}):`, error);
      return false;
    }
  }

  /**
   * 현재 페이지의 모든 키를 가져오기
   */
  getAllKeysForCurrentPage(): string[] {
    if (!isClient) return [];

    const pagePrefix = `${this.pageId}`;
    const allKeys = Object.keys(localStorage);
    
    return allKeys
      .filter(key => key.endsWith(`-${pagePrefix}`))
      .map(key => key.replace(`-${pagePrefix}`, ''));
  }

  /**
   * 현재 페이지의 모든 데이터 삭제
   */
  clearPageData(): boolean {
    if (!isClient) return false;

    try {
      const pageKeys = this.getAllKeysForCurrentPage();
      pageKeys.forEach(key => {
        const pageAwareKey = createPageAwareKey(key, this.pageId);
        localStorage.removeItem(pageAwareKey);
      });
      return true;
    } catch (error) {
      console.warn(`Failed to clear page data (pageId: ${this.pageId}):`, error);
      return false;
    }
  }

  /**
   * 페이지 ID 변경
   */
  setPageId(newPageId: string): void {
    this.pageId = newPageId;
  }

  /**
   * 현재 페이지 ID 반환
   */
  getPageId(): string {
    return this.pageId;
  }
}

/**
 * React Hook: 페이지별 localStorage 관리
 */
export const usePageAwareLocalStorage = () => {
  const pathname = usePathname();
  
  const storage = useMemo(() => {
    const pageId = getPageId(pathname);
    return new PageAwareLocalStorage(pageId);
  }, [pathname]);

  return storage;
};

/**
 * 전역적으로 사용할 수 있는 페이지별 localStorage 인스턴스
 */
export const createPageAwareStorage = (pageId?: string) => {
  return new PageAwareLocalStorage(pageId);
};

// 기본 인스턴스 (현재 페이지 기준)
export const pageAwareStorage = new PageAwareLocalStorage();

/**
 * 디버깅을 위한 유틸리티 함수들
 */
export const debugStorage = {
  /**
   * 모든 localStorage 키 출력 (페이지별로 그룹화)
   */
  logAllKeys: () => {
    if (!isClient) return;

    const allKeys = Object.keys(localStorage);
    const groupedKeys: Record<string, string[]> = {};

    allKeys.forEach(key => {
      const parts = key.split('-');
      if (parts.length >= 2) {
        const pageId = parts[parts.length - 1];
        const baseKey = parts.slice(0, -1).join('-');
        
        if (!groupedKeys[pageId]) {
          groupedKeys[pageId] = [];
        }
        groupedKeys[pageId].push(baseKey);
      } else {
        if (!groupedKeys['unknown']) {
          groupedKeys['unknown'] = [];
        }
        groupedKeys['unknown'].push(key);
      }
    });

    console.group('LocalStorage Keys by Page:');
    Object.entries(groupedKeys).forEach(([pageId]) => {
      console.group(`Page: ${pageId}`);
      console.groupEnd();
    });
    console.groupEnd();
  },

  /**
   * 특정 페이지의 모든 데이터 출력
   */
  logPageData: (pageId: string) => {
    if (!isClient) return;

    const storage = new PageAwareLocalStorage(pageId);
    const keys = storage.getAllKeysForCurrentPage();
    
    console.group(`Page Data for: ${pageId}`);
    keys.forEach(_key => {
    });
    console.groupEnd();
  }
};