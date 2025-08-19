# 데이터베이스 마이그레이션 실행

다음 SQL을 Supabase 대시보드에서 실행해주세요:

```sql
-- tokens 테이블의 type 체크 제약조건에 'email_verification' 추가
ALTER TABLE tokens 
DROP CONSTRAINT IF EXISTS tokens_type_check;

ALTER TABLE tokens 
ADD CONSTRAINT tokens_type_check 
CHECK (type IN ('password_reset', 'signup_invite', 'email_verification'));
```

또는 터미널에서:
```bash
# Supabase CLI가 설치되어 있다면
npx supabase db push
```

## 수정 사항 요약

1. **토큰 타입 추가**: `email_verification` 타입 지원
2. **TokenService 개선**: 데이터가 포함된 토큰 생성을 위한 `createTokenWithData` 메서드 추가
3. **메모리 캐시**: 토큰별 추가 데이터를 임시 저장하는 캐시 시스템
4. **API 엔드포인트**: `register-public`과 `verify-email` 엔드포인트 구현

## 테스트 방법

1. `http://localhost:3000/auth` 방문
2. "회원가입하기" 버튼 클릭
3. 정보 입력 후 제출
4. 이메일 확인 후 인증 링크 클릭
5. 자동 로그인 및 메인 페이지 리다이렉트