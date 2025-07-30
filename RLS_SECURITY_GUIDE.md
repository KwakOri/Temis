# 🔒 Temis 프로젝트 RLS 보안 가이드

## 📋 개요

이 가이드는 Temis 프로젝트의 Supabase RLS (Row Level Security) 설정과 보안 최적화를 위한 종합적인 안내서입니다.

## 🚀 RLS 설정 적용 방법

### 1. SQL 파일 실행

```bash
# Supabase CLI 사용
supabase db reset
supabase db push

# 또는 Supabase Dashboard에서 직접 실행
# supabase_rls_setup.sql 내용을 SQL Editor에 복사하여 실행
```

### 2. 환경 변수 설정

`.env.local` 파일에 관리자 이메일 추가:

```bash
# 관리자 이메일 목록 (쉼표로 구분)
ADMIN_EMAILS=admin@temis.com,manager@temis.com,dev@temis.com
```

### 3. JWT 토큰 설정 확인

Supabase JWT 토큰에 다음 클레임이 포함되어야 합니다:

```json
{
  "user_id": 123,
  "email": "user@example.com",
  "role": "authenticated"
}
```

## 🔐 보안 정책 상세

### Users 테이블

| 작업 | 권한 | 설명 |
|------|------|------|
| SELECT | 자신 + 관리자 | 사용자는 자신의 정보만, 관리자는 모든 사용자 정보 조회 |
| INSERT | 모든 사용자 | 회원가입을 위해 누구나 사용자 생성 가능 |
| UPDATE | 자신 + 관리자 | 사용자는 자신의 정보만, 관리자는 모든 사용자 정보 수정 |
| DELETE | 관리자만 | 계정 삭제는 관리자만 가능 |

### Templates 테이블

| 작업 | 권한 | 설명 |
|------|------|------|
| SELECT | 공개 템플릿 + 권한 보유자 + 관리자 | 공개 템플릿은 누구나, 비공개는 권한자만 조회 |
| INSERT | 관리자만 | 템플릿 생성은 관리자만 가능 |
| UPDATE | 관리자만 | 템플릿 수정은 관리자만 가능 |
| DELETE | 관리자만 | 템플릿 삭제는 관리자만 가능 |

### Template_access 테이블

| 작업 | 권한 | 설명 |
|------|------|------|
| SELECT | 자신 관련 + 관리자 | 자신의 권한 정보만 조회 가능 |
| INSERT | 관리자만 | 권한 부여는 관리자만 가능 |
| UPDATE | 관리자만 | 권한 수정은 관리자만 가능 |
| DELETE | 관리자만 | 권한 제거는 관리자만 가능 |

## ⚡ 성능 최적화

### 1. 인덱스 최적화

RLS 정책과 함께 생성되는 인덱스:

```sql
-- 이메일 검색 최적화
CREATE INDEX idx_users_email ON users(email);

-- 공개 템플릿 필터링 최적화
CREATE INDEX idx_templates_is_public ON templates(is_public);

-- 권한 확인 최적화
CREATE INDEX idx_template_access_user_template ON template_access(user_id, template_id);
```

### 2. 함수 캐싱

자주 호출되는 함수들은 `SECURITY DEFINER`로 설정되어 성능을 향상시킵니다:

- `get_current_user_id()`
- `is_current_user_admin()`
- `has_template_access()`

## 🛡️ 보안 강화 방안

### 1. JWT 토큰 보안

```typescript
// JWT 토큰 검증 강화
const validateJWTClaims = (token: any) => {
  if (!token.user_id || !token.email) {
    throw new Error('Invalid JWT claims');
  }
  
  // 추가 검증 로직
  if (typeof token.user_id !== 'number') {
    throw new Error('Invalid user_id type');
  }
};
```

### 2. 관리자 권한 추가 검증

```typescript
// 이중 관리자 권한 확인
const verifyAdminAccess = async (userId: number) => {
  const user = await UserService.findById(userId);
  const isAdminEmail = process.env.ADMIN_EMAILS?.includes(user.email);
  const hasAdminRole = await checkAdminRoleInDB(userId);
  
  return isAdminEmail && hasAdminRole;
};
```

### 3. 레이트 리미팅

```typescript
// API 레이트 리미팅 추가
const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회 요청
  standardHeaders: true,
  legacyHeaders: false,
};
```

## 🧪 테스트 시나리오

### 1. 기본 권한 테스트

```typescript
// 테스트 케이스 예시
describe('RLS 정책 테스트', () => {
  test('공개 템플릿은 누구나 조회 가능', async () => {
    const publicTemplates = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', true);
    
    expect(publicTemplates.data).toBeDefined();
  });

  test('비공개 템플릿은 권한자만 조회 가능', async () => {
    // 권한이 없는 사용자로 테스트
    const privateTemplates = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', false);
    
    expect(privateTemplates.data).toHaveLength(0);
  });

  test('관리자는 모든 템플릿 조회 가능', async () => {
    // 관리자 토큰으로 테스트
    const allTemplates = await supabase
      .from('templates')
      .select('*');
    
    expect(allTemplates.data.length).toBeGreaterThan(0);
  });
});
```

### 2. 보안 침입 테스트

```sql
-- SQL 인젝션 방지 테스트
SELECT * FROM templates WHERE id = 'malicious-input; DROP TABLE users;';

-- 권한 우회 시도 테스트
UPDATE users SET email = 'hacker@evil.com' WHERE id != get_current_user_id();
```

## 🚨 모니터링 및 알림

### 1. 보안 이벤트 로깅

```sql
-- 보안 이벤트 로깅 테이블
CREATE TABLE security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 위반 로깅 함수
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id INTEGER,
  p_event_type TEXT,
  p_details JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO security_logs (user_id, event_type, event_details)
  VALUES (p_user_id, p_event_type, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. 실시간 알림 설정

```typescript
// 의심스러운 활동 감지
const monitorSecurityEvents = () => {
  supabase
    .channel('security_logs')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'security_logs'
    }, (payload) => {
      if (payload.new.event_type === 'UNAUTHORIZED_ACCESS') {
        sendSlackAlert(payload.new);
      }
    })
    .subscribe();
};
```

## 📝 체크리스트

### 배포 전 확인사항

- [ ] RLS가 모든 테이블에 활성화되어 있는가?
- [ ] 관리자 이메일이 올바르게 설정되어 있는가?
- [ ] JWT 토큰 클레임이 올바르게 구성되어 있는가?
- [ ] 모든 RLS 정책이 예상대로 작동하는가?
- [ ] 성능 테스트가 완료되었는가?
- [ ] 보안 테스트가 완료되었는가?

### 운영 중 모니터링

- [ ] 보안 로그가 정상적으로 기록되고 있는가?
- [ ] 의심스러운 접근 시도가 감지되고 있는가?
- [ ] 성능 지표가 정상 범위 내에 있는가?
- [ ] RLS 정책 위반 사례가 있는가?

## 🔧 트러블슈팅

### 자주 발생하는 문제

1. **JWT 토큰 인식 실패**
   ```sql
   -- 현재 JWT 클레임 확인
   SELECT current_setting('request.jwt.claims', true);
   ```

2. **RLS 정책 적용 안됨**
   ```sql
   -- RLS 활성화 상태 확인
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

3. **성능 저하**
   ```sql
   -- 쿼리 실행 계획 확인
   EXPLAIN ANALYZE SELECT * FROM templates WHERE is_public = true;
   ```

## 📞 지원 및 문의

보안 관련 문제나 RLS 설정에 대한 질문이 있으시면 다음으로 연락주세요:

- 개발팀: dev@temis.com
- 보안팀: security@temis.com
- Supabase 공식 문서: https://supabase.com/docs/guides/auth/row-level-security