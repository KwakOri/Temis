import { useEffect } from 'react';
import { TDefaultCard } from '../_settings/general';
import { TTheme } from '../_settings/settings';
import { useAutoSavePersistence, useBeforeUnloadSave } from '../_utils/formPersistence';

/**
 * 타임테이블 데이터 지속성 관리 훅
 * 자동 저장과 브라우저 종료 시 저장을 담당
 */
export const useTimeTablePersistence = (
  data: TDefaultCard[],
  profileText: string,
  profileImage: string,
  currentTheme: TTheme,
  scale: number,
  autoSaveDelay: number = 1000
) => {
  
  // 자동 저장 기능 활성화 (디바운스 적용)
  const autoSave = useAutoSavePersistence(
    data, 
    profileText, 
    profileImage, 
    currentTheme, 
    scale, 
    autoSaveDelay
  );

  // 브라우저 종료/새로고침 시 저장
  useBeforeUnloadSave(
    data, 
    profileText, 
    profileImage, 
    currentTheme, 
    scale
  );

  // 디버깅을 위한 저장 상태 로깅 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('TimeTable persistence data updated:', {
        dataLength: data.length,
        profileTextLength: profileText.length,
        hasProfileImage: !!profileImage,
        currentTheme,
        scale
      });
    }
  }, [data, profileText, profileImage, currentTheme, scale]);

  return {
    // 자동 저장 함수 (수동 트리거용)
    autoSave,
  };
};