# 🔒 간소화된 RLS 설정 가이드

## 📋 개요

Temis 프로젝트의 기본적인 보안 요구사항을 만족하는 간소화된 RLS 설정입니다.

## 🚀 적용 방법

### 1. SQL 실행

Supabase Dashboard → SQL Editor에서 `simple_rls_setup.sql` 실행

### 2. 관리자 이메일 설정

SQL에서 관리자 이메일 수정:

```sql
-- is_admin_user 함수에서 이메일 수정
RETURN user_email IN ('your-admin@email.com', 'another-admin@email.com');
```

## 🔐 보안 규칙

### Users (사용자)
- ✅ 자신의 정보만 조회/수정 가능
- ✅ 관리자는 모든 사용자 접근 가능
- ✅ 회원가입은 누구나 가능

### Templates (템플릿)  
- ✅ 공개 템플릿은 누구나 조회 가능
- ✅ 비공개 템플릿과 생성/수정/삭제는 관리자만 가능

### Template_access (접근 권한)
- ✅ 관리자만 모든 작업 가능

## 🧪 테스트

### 일반 사용자로 테스트
```sql
-- 공개 템플릿만 보임
SELECT * FROM templates;

-- 자신의 정보만 보임  
SELECT * FROM users;
```

### 관리자로 테스트
```sql
-- 모든 템플릿 보임
SELECT * FROM templates;

-- 모든 사용자 보임
SELECT * FROM users;

-- 템플릿 생성 가능
INSERT INTO templates (name, description) VALUES ('테스트', '설명');
```

## ⚠️ 주의사항

1. **JWT 토큰**에 `user_id` 클레임이 포함되어야 함
2. **관리자 이메일**을 SQL 함수에서 직접 수정해야 함
3. **공개 템플릿**만 인증 없이 접근 가능

## 🔧 트러블슈팅

### JWT 토큰 확인
```sql
-- 현재 JWT 확인
SELECT current_setting('request.jwt.claims', true);
```

### RLS 활성화 확인
```sql
-- RLS 상태 확인
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

이 설정으로 **기본적인 보안**은 충분히 확보됩니다!