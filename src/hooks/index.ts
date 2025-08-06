// TimeTable Unified Hooks - CardInputConfig 기반 통합 훅 시스템
// 모든 페이지에서 CardInputConfig 초기값을 받아 동일한 훅을 재사용할 수 있습니다.

// 개별 기능별 훅들
export { useTimeTableData } from "./useTimeTableData";
export { useTimeTableTheme } from "./useTimeTableTheme";
export { useTimeTablePersistence } from "./useTimeTablePersistence";

// 전역 상태 관리 훅
export { useTimeTableState } from "./useTimeTableState";

// 통합 관리 훅 (권장)
export { useTimeTableEditor } from "./useTimeTableEditor";

// 기타 유틸리티 훅들
export { useTimeTableDesignGuide } from "./useTimeTableDesignGuide";
export { useTemplateAccess } from "./useTemplateAccess";

/**
 * TimeTable Unified Hooks 사용 가이드
 *
 * 1. 메인 훅 사용 (권장) - CardInputConfig를 받아서 모든 기능을 통합 관리
 * ```tsx
 * import { useTimeTableEditor } from '@/hooks';
 * import { CARD_INPUT_CONFIG } from './settings';
 *
 * const TimeTablePage = () => {
 *   const {
 *     data, updateData,
 *     currentTheme, updateTheme,
 *     state, actions,
 *     resetAll
 *   } = useTimeTableEditor({ 
 *     cardInputConfig: CARD_INPUT_CONFIG,
 *     defaultTheme: "main",
 *     autoSaveDelay: 1000
 *   });
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 2. 개별 훅 사용 (세밀한 제어가 필요한 경우)
 * ```tsx
 * import { useTimeTableData, useTimeTableTheme } from '@/hooks';
 * import { CARD_INPUT_CONFIG } from './settings';
 *
 * const MyComponent = () => {
 *   const { data, updateData } = useTimeTableData({ cardInputConfig: CARD_INPUT_CONFIG });
 *   const { currentTheme, updateTheme } = useTimeTableTheme("main");
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 3. 각 훅의 책임
 * - useTimeTableData: 타임테이블 데이터 CRUD 관리 (CardInputConfig 기반)
 * - useTimeTableTheme: 테마 상태 관리
 * - useTimeTablePersistence: localStorage 자동 저장 (CardInputConfig 포함)
 * - useTimeTableState: 전역 상태 관리 (프로필, 이미지, 날짜, 스케일 등)
 * - useTimeTableEditor: 위 모든 훅들을 통합한 메인 훅
 *
 * 4. CardInputConfig 통합의 혜택
 * - 모든 페이지에서 동일한 훅 재사용 가능
 * - 각 페이지별 고유한 설정을 CardInputConfig로 주입
 * - 설정 변경 시 자동으로 데이터 구조 일치성 확인
 * - localStorage에 설정 정보도 함께 저장하여 호환성 보장
 * - 코드 중복 제거 및 유지보수성 향상
 *
 * 5. 마이그레이션 가이드
 * - 기존 페이지별 훅을 제거하고 이 통합 훅으로 교체
 * - 각 페이지의 settings에서 CARD_INPUT_CONFIG를 정의
 * - useTimeTableEditor({ cardInputConfig: CARD_INPUT_CONFIG })로 사용
 * - 기존 함수명과 동일하므로 컴포넌트 코드 변경 최소화
 */