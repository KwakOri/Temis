import bcrypt from 'bcryptjs';

/**
 * 비밀번호 해싱
 * @param password - 원본 비밀번호
 * @param saltRounds - 솔트 라운드 (기본값: 12)
 * @returns 해싱된 비밀번호
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 12
): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * 비밀번호 검증
 * @param password - 입력된 비밀번호
 * @param hashedPassword - 해싱된 비밀번호
 * @returns 비밀번호 일치 여부
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * 비밀번호 강도 검증
 * @param password - 검증할 비밀번호
 * @returns 강도 검증 결과
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('비밀번호에 대문자가 포함되어야 합니다.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('비밀번호에 소문자가 포함되어야 합니다.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('비밀번호에 숫자가 포함되어야 합니다.');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('비밀번호에 특수문자가 포함되어야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}