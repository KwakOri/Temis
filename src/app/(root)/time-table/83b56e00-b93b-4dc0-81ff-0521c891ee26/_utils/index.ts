// _utils 폴더의 모든 유틸리티 함수들을 export
export * from './localStorage';
export * from './formPersistence';

// 사용 예제와 가이드를 위한 주석
/**
 * Template TimeTable Utils 사용 가이드
 * 
 * 1. localStorage.ts - 데이터 저장/로드 기본 함수들
 *    - timeTableStorage.saveData() / loadData() - 타임테이블 데이터
 
 *    - timeTableStorage.saveTheme() / loadTheme() - 테마 설정
 *    - timeTableStorage.saveAll() / loadAll() - 모든 데이터 일괄 처리
 * 
 * 2. formPersistence.ts - React 컴포넌트에서 사용하는 커스텀 훅들
 *    - useFormPersistence() - 기본 저장/로드 함수들
 *    - useAutoSavePersistence() - 자동 저장 기능 (디바운스 적용)
 *    - useBeforeUnloadSave() - 브라우저 종료 시 자동 저장
 *    - fieldSavers - 개별 필드별 저장 함수들
 * 
 * 3. TimeTableEditor.tsx 통합 예제:
 *    ```tsx
 *    import { useFormPersistence, useAutoSavePersistence } from '../_utils';
 *    
 *    const MyComponent = () => {
 *      const { loadPersistedData } = useFormPersistence();
 *      
 *      const [data, setData] = useState(() => {
 *        const persisted = loadPersistedData();
 *        return persisted.data.length > 0 ? persisted.data : defaultCards;
 *      });
 *      
 *      // 1초 디바운스로 자동 저장
 *      useAutoSavePersistence(data, theme);
 *      
 *      return <div>...</div>;
 *    };
 *    ```
 */