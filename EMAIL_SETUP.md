# 📧 Temis Email System Setup Guide

Nodemailer + Gmail SMTP를 사용한 토큰 기반 이메일 시스템 설정 가이드입니다.

## 🔧 환경 변수 설정

### 필수 환경 변수

`.env.local` 파일에 다음 환경 변수들이 설정되어 있어야 합니다:

```env
# Gmail SMTP 설정
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password_here

# 애플리케이션 URL
NEXT_PUBLIC_APP_URL=https://temis.kr

# 관리자 이메일 (여러 개는 콤마로 구분)
ADMIN_EMAILS=admin@temis.kr,admin2@temis.kr

# 환경 설정
NEXT_PUBLIC_ENVIRONMENT=development  # 또는 production
```

## 📮 Gmail 설정

### 1. Gmail 앱 비밀번호 생성

1. [Google 계정 설정](https://myaccount.google.com/)으로 이동
2. **보안** 탭 클릭
3. **2단계 인증**이 활성화되어 있는지 확인
4. **앱 비밀번호** 생성:
   - "앱 비밀번호" 검색
   - "메일" 앱 선택
   - 기기 선택 또는 "기타"로 "Temis" 입력
   - 생성된 16자리 비밀번호를 `GMAIL_PASS`에 설정

### 2. Gmail 보안 설정

- **2단계 인증 필수**: 앱 비밀번호 사용을 위해 필요
- **안전하지 않은 앱 액세스**: 비활성화 상태 유지 (앱 비밀번호 사용으로 불필요)

## 🗄️ 데이터베이스 설정

### Tokens 테이블 생성

```sql
-- tokens_table_schema.sql 파일 실행
CREATE TABLE tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('password_reset', 'signup_invite')),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_tokens_token ON tokens(token);
CREATE INDEX idx_tokens_email ON tokens(email);
CREATE INDEX idx_tokens_type ON tokens(type);
CREATE INDEX idx_tokens_expires_at ON tokens(expires_at);
```

## 🚀 시스템 기능

### 1. 비밀번호 재설정

**플로우:**
1. 사용자가 "비밀번호 찾기" 클릭
2. 이메일 입력 → `POST /api/auth/forgot-password`
3. 시스템이 토큰 생성 및 이메일 발송
4. 사용자가 이메일 링크 클릭 → `/auth/reset-password?token=...`
5. 새 비밀번호 설정 → `POST /api/auth/reset-password`

### 2. 초대 기반 회원가입

**플로우:**
1. 관리자가 이메일 주소로 초대 → `POST /api/admin/invite-user`
2. 시스템이 초대 토큰 생성 및 이메일 발송
3. 수신자가 링크 클릭 → `/auth/signup?token=...`
4. 회원가입 진행 → `POST /api/auth/register`
5. 환영 이메일 자동 발송

### 3. 관리자 기능

- **초대 관리**: `AdminInviteManagement` 컴포넌트
- **초대 현황 조회**: `GET /api/admin/invites`
- **일괄 이메일 발송**: `POST /api/email/bulk`
- **SMTP 연결 테스트**: `GET /api/email/test`

## 🧪 테스트 방법

### 1. SMTP 연결 테스트

```bash
# 개발 환경에서만 가능
curl -X GET http://localhost:3000/api/email/test \
  -H "Cookie: auth-token=YOUR_ADMIN_TOKEN"
```

### 2. 테스트 이메일 발송

```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_ADMIN_TOKEN" \
  -d '{"to": "test@example.com"}'
```

### 3. 비밀번호 재설정 테스트

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

## 📊 모니터링

### 이메일 발송 로그

콘솔에서 다음과 같은 로그를 확인할 수 있습니다:

```
✅ 이메일 발송 성공: {
  messageId: '0100018d-...',
  to: 'user@example.com',
  subject: '[Temis] 비밀번호 재설정 요청',
  type: 'password_reset'
}
```

### 에러 처리

일반적인 Gmail 에러와 해결 방법:

- **Invalid login**: Gmail 이메일/앱 비밀번호 확인
- **Daily sending quota exceeded**: Gmail 일일 발송 한도 초과 (개인: 100통/일)
- **Invalid recipient**: 수신자 이메일 주소 형식 오류

## 🔒 보안 고려사항

### 1. 환경 변수 보안

- `.env.local` 파일을 `.gitignore`에 추가
- 프로덕션에서는 환경 변수 관리 서비스 사용

### 2. 토큰 보안

- 32바이트 암호학적 안전한 랜덤 토큰 사용
- 토큰 만료시간 설정 (비밀번호 재설정: 24시간, 회원가입: 72시간)
- 사용된 토큰 자동 무효화

### 3. 이메일 발송 제한

- 일괄 발송 시 최대 100개 제한
- 레이트 리밋 (100ms 지연)
- 관리자 권한 확인

## 🚨 문제 해결

### 자주 발생하는 문제

1. **SMTP 연결 실패**
   - Gmail 2단계 인증 활성화 확인
   - 앱 비밀번호 재생성
   - 환경 변수 확인

2. **이메일 미수신**
   - 스팸 폴더 확인
   - Gmail 발송 한도 확인
   - 수신자 이메일 주소 확인

3. **토큰 유효성 검증 실패**
   - 토큰 만료시간 확인
   - 데이터베이스 연결 상태 확인
   - 토큰 형식 확인

### 디버깅 도구

개발 환경에서 사용할 수 있는 디버깅 도구:

- `GET /api/email/test`: SMTP 연결 및 설정 확인
- `POST /api/email/test`: 실제 이메일 발송 테스트
- 콘솔 로그: 이메일 발송 성공/실패 로그

## 📈 성능 최적화

### 1. 연결 재사용

- Nodemailer transporter 싱글톤 패턴 사용
- 연결 풀링으로 성능 향상

### 2. 일괄 처리

- 여러 이메일 발송 시 일괄 처리 API 사용
- 레이트 리밋으로 Gmail 정책 준수

### 3. 에러 복구

- 자동 재시도 로직
- 실패한 이메일 로깅
- Graceful degradation

---

📝 **참고**: 이 시스템은 Gmail SMTP를 사용합니다. 대량 발송이 필요한 경우 SendGrid, AWS SES 등의 전문 서비스로 전환을 고려하세요.