// Template TimeTable Hooks - 모든 커스텀 훅들을 export

// 개별 기능별 훅들
export { useTimeTableData } from "./useTimeTableData";
export { useTimeTablePersistence } from "./useTimeTablePersistence";
export { useTimeTableTheme } from "./useTimeTableTheme";

// 통합 관리 훅
export { useTimeTableEditor } from "./useTimeTableEditor";

/**
 * Template TimeTable Hooks 사용 가이드
 *
 * 1. 개별 훅 사용 (세밀한 제어가 필요한 경우)
 * ```tsx
 * import { useTimeTableData, useTimeTableTheme } from '../_hooks';
 *
 * const MyComponent = () => {
 *   const { data, updateData } = useTimeTableData();
 *   const { currentTheme, updateTheme } = useTimeTableTheme();
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 2. 통합 훅 사용 (전체 상태가 필요한 경우) - 권장
 * ```tsx
 * import { useTimeTableEditor } from '../_hooks';
 *
 * const TimeTableEditor = () => {
 *   const {
 *     data, updateData,
 *     currentTheme, updateTheme,
 *     profileText, updateProfileText,
 *     state
 *   } = useTimeTableEditor();
 *
 *   return <div>...</div>;
 * };
 * ```
 *
 * 3. 각 훅의 책임
 * - useTimeTableData: 타임테이블 데이터 CRUD 관리
 * - useTimeTableTheme: 테마 상태 관리
 * - useTimeTableProfile: 프로필 텍스트/이미지 관리
 * - useTimeTablePersistence: localStorage 자동 저장
 * - useTimeTableEditor: 위 모든 훅들을 통합한 메인 훅
 *
 * 4. 혜택
 * - 관심사의 분리로 코드 가독성 향상
 * - 개별 기능 테스트 용이성
 * - 재사용성 증가
 * - 유지보수성 향상
 */
