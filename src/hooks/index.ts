// TimeTable Unified Hooks - CardInputConfig 기반 통합 훅 시스템
// 모든 페이지에서 CardInputConfig 초기값을 받아 동일한 훅을 재사용할 수 있습니다.

// TimeTable 개별 기능별 훅들
export { useTimeTableData } from "./useTimeTableData";
export { useTimeTableTheme } from "./useTimeTableTheme";
export { useTimeTablePersistence } from "./useTimeTablePersistence";

// 전역 상태 관리 훅
export { useTimeTableState } from "./useTimeTableState";

// TimeTable 통합 관리 훅 (권장)
export { useTimeTableEditor } from "./useTimeTableEditor";

// Thumbnail 개별 기능별 훅들
export { useThumbnailData } from "./useThumbnailData";
export { useThumbnailPersistence } from "./useThumbnailPersistence";

// Thumbnail 통합 관리 훅 (권장)
export { useThumbnailEditor } from "./useThumbnailEditor";

// 기타 유틸리티 훅들
export { useTimeTableDesignGuide } from "./useTimeTableDesignGuide";
export { useTemplateAccess } from "./useTemplateAccess";

/**
 * TimeTable & Thumbnail Unified Hooks 사용 가이드
 *
 * 1. TimeTable 메인 훅 사용 (권장) - 일주일치 시간표 관리
 * ```tsx
 * import { useTimeTableEditor } from '@/hooks';
 * import { CARD_INPUT_CONFIG } from './settings';
 *
 * const TimeTablePage = () => {
 *   const {
 *     data, updateData, updateCard,  // 7일간의 데이터 배열
 *     currentTheme, updateTheme,
 *     state, actions,
 *     resetAll
 *   } = useTimeTableEditor({
 *     cardInputConfig: CARD_INPUT_CONFIG,
 *     defaultTheme: "first",
 *     autoSaveDelay: 1000
 *   });
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 2. Thumbnail 메인 훅 사용 (권장) - 단일 카드 썸네일 관리
 * ```tsx
 * import { useThumbnailEditor } from '@/hooks';
 * import { CARD_INPUT_CONFIG } from './settings';
 *
 * const ThumbnailPage = () => {
 *   const {
 *     data, updateCard,  // 단일 카드 데이터
 *     addEntry, removeEntry,  // 엔트리 관리
 *     currentTheme, updateTheme,
 *     state, actions,  // 스크린샷, 이미지 편집 등
 *     resetAll
 *   } = useThumbnailEditor({
 *     cardInputConfig: CARD_INPUT_CONFIG,
 *     defaultTheme: "first",
 *     autoSaveDelay: 1000
 *   });
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 3. 개별 훅 사용 (세밀한 제어가 필요한 경우)
 * ```tsx
 * import { useTimeTableData, useThumbnailData, useTimeTableTheme } from '@/hooks';
 * import { CARD_INPUT_CONFIG } from './settings';
 *
 * const MyComponent = () => {
 *   // 시간표용: 7일 데이터
 *   const { data: weekData } = useTimeTableData({ cardInputConfig: CARD_INPUT_CONFIG });
 *
 *   // 썸네일용: 단일 카드 데이터
 *   const { data: cardData } = useThumbnailData({ cardInputConfig: CARD_INPUT_CONFIG });
 *
 *   const { currentTheme } = useTimeTableTheme("first");
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 4. 각 훅의 책임
 *
 * [TimeTable 관련]
 * - useTimeTableData: 일주일치(7일) 타임테이블 데이터 CRUD 관리
 * - useTimeTableEditor: 시간표용 통합 훅 (7일 데이터)
 *
 * [Thumbnail 관련]
 * - useThumbnailData: 단일 카드 데이터 CRUD 관리
 * - useThumbnailPersistence: 단일 카드 localStorage 자동 저장
 * - useThumbnailEditor: 썸네일용 통합 훅 (단일 카드)
 *
 * [공통]
 * - useTimeTableTheme: 테마 상태 관리 (공통)
 * - useTimeTableState: 전역 상태 관리 - 스크린샷, 이미지 편집 등 (공통)
 *
 * 5. CardInputConfig 통합의 혜택
 * - 모든 페이지에서 동일한 훅 재사용 가능
 * - 각 페이지별 고유한 설정을 CardInputConfig로 주입
 * - 설정 변경 시 자동으로 데이터 구조 일치성 확인
 * - localStorage에 설정 정보도 함께 저장하여 호환성 보장
 * - 코드 중복 제거 및 유지보수성 향상
 *
 * 6. TimeTable vs Thumbnail 선택 가이드
 * - useTimeTableEditor: 일주일 시간표 페이지에서 사용 (7일 데이터)
 * - useThumbnailEditor: 썸네일 제작 페이지에서 사용 (단일 카드)
 * - 공통 기능: 스크린샷, 이미지 편집, 테마는 두 훅 모두 지원
 */