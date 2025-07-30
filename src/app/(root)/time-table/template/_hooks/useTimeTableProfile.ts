import { useState, useCallback } from 'react';
import { useFormPersistence } from '../_utils/formPersistence';

/**
 * 타임테이블 프로필 이미지 상태 관리 훅
 * (profileText는 공용 컴포넌트에서 처리하므로 제외)
 */
export const useTimeTableProfile = () => {
  const { loadPersistedData } = useFormPersistence();

  // localStorage에서 저장된 프로필 이미지 로드하여 초기값 설정
  const [profileImage, setProfileImage] = useState<string>(() => {
    const persistedData = loadPersistedData();
    return persistedData.profileImage || "";
  });

  // 프로필 이미지 업데이트 함수
  const updateProfileImage = useCallback((image: string) => {
    setProfileImage(image);
  }, []);

  // 프로필 이미지 초기화
  const clearProfileImage = useCallback(() => {
    setProfileImage("");
  }, []);

  // 프로필 이미지 유효성 검사 (Base64 형식 체크)
  const isProfileImageValid = useCallback((image: string = profileImage) => {
    if (!image) return true; // 빈 이미지는 유효함
    
    // Base64 형식 체크
    const base64Pattern = /^data:image\/(jpeg|jpg|png|gif);base64,/;
    return base64Pattern.test(image);
  }, [profileImage]);

  // 파일에서 이미지를 Base64로 변환하는 헬퍼 함수
  const convertFileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsDataURL(file);
    });
  }, []);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      // 파일 크기 검증 (5MB 제한)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }

      const base64 = await convertFileToBase64(file);
      updateProfileImage(base64);
      return base64;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }, [convertFileToBase64, updateProfileImage]);

  return {
    // 상태
    profileImage,
    
    // 업데이트 함수들
    updateProfileImage,
    
    // 초기화 함수들
    clearProfileImage,
    
    // 유효성 검사 함수들
    isProfileImageValid,
    
    // 파일 처리 함수들
    handleFileUpload,
    convertFileToBase64,
  };
};