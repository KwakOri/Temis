# Supabase 유저 데이터 저장소 설정 가이드

이 가이드는 Temis 앱에서 JWT 인증 시스템을 유지하면서 Supabase를 유저 데이터 저장용으로 사용하는 방법을 설명합니다.

## 📋 개요

- **인증 방식**: 기존 JWT 방식 유지
- **데이터 저장**: Supabase PostgreSQL 데이터베이스
- **Supabase 인증**: 사용하지 않음 (자체 JWT 시스템 사용)

## 🚀 설정 단계

### 1. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com) 계정 생성 및 로그인
2. 새 프로젝트 생성
3. 프로젝트 설정에서 다음 정보 확인:
   - Project URL
   - API Keys > anon public

### 2. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# 기존 JWT Secret (유지)
JWT_SECRET=your-super-secret-jwt-key-here

# Supabase 설정 (추가)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 3. 데이터베이스 테이블 생성

Supabase 대시보드의 SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하세요:

```sql
-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 및 트리거 생성 (자세한 내용은 supabase-schema.sql 참조)
```

### 4. RLS (Row Level Security) 설정 (선택사항)

운영 환경에서는 보안을 위해 RLS 정책을 설정하는 것을 권장합니다.

```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (예시)
CREATE POLICY "Allow all operations for authenticated users" ON users
  FOR ALL USING (true) WITH CHECK (true);
```

## 📁 주요 파일 구조

```
src/
├── lib/
│   ├── supabase.ts          # Supabase 클라이언트 및 UserService
│   └── auth/
│       ├── jwt.ts           # JWT 관련 함수 (기존)
│       └── middleware.ts    # 인증 미들웨어 (기존)
└── app/api/auth/
    ├── login/route.ts       # 로그인 (Supabase 연동)
    ├── register/route.ts    # 회원가입 (Supabase 연동)
    └── protected-example/   # 보호된 라우트 예제
```

## 🔧 주요 기능

### UserService 클래스

사용자 데이터 관리를 위한 서비스 클래스:

```typescript
import { UserService } from '@/lib/supabase';

// 사용자 조회
const user = await UserService.findByEmail('user@example.com');
const user = await UserService.findById('user-id');

// 사용자 생성
const newUser = await UserService.create({
  email: 'new@example.com',
  name: '새 사용자',
  password: 'hashed-password'
});

// 사용자 업데이트
const updatedUser = await UserService.update('user-id', {
  name: '수정된 이름'
});

// 사용자 삭제
await UserService.delete('user-id');
```

### 인증 흐름

1. **회원가입**: `/api/auth/register`
   - 입력 검증 → 비밀번호 해싱 → Supabase에 저장 → JWT 토큰 생성

2. **로그인**: `/api/auth/login`
   - Supabase에서 사용자 조회 → 비밀번호 검증 → JWT 토큰 생성

3. **보호된 라우트 접근**:
   - JWT 토큰 검증 → (선택적) Supabase에서 최신 사용자 정보 조회

## 🧪 테스트

개발 서버를 실행하고 다음 엔드포인트를 테스트해보세요:

```bash
npm run dev
```

### 회원가입 테스트
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "테스트 사용자"
  }'
```

### 로그인 테스트
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### 보호된 리소스 접근
```bash
curl -X GET http://localhost:3000/api/auth/protected-example \
  -H "Cookie: auth-token=your-jwt-token"
```

## 🔒 보안 고려사항

1. **환경 변수**: `.env.local` 파일을 반드시 `.gitignore`에 추가
2. **RLS 정책**: 운영 환경에서는 적절한 RLS 정책 설정
3. **JWT Secret**: 강력한 시크릿 키 사용
4. **HTTPS**: 운영 환경에서는 반드시 HTTPS 사용

## 🚨 주의사항

- Supabase의 인증 기능은 사용하지 않습니다
- 모든 인증은 자체 JWT 시스템을 통해 처리됩니다
- Supabase는 순수하게 데이터 저장용으로만 사용됩니다

## 🆘 문제 해결

### 1. Supabase 연결 오류
- API URL과 키가 정확한지 확인
- 환경 변수가 올바르게 설정되었는지 확인

### 2. 테이블이 없다는 오류
- SQL 스크립트가 정상적으로 실행되었는지 확인
- Supabase 대시보드에서 테이블이 생성되었는지 확인

### 3. 권한 오류
- RLS 정책이 올바르게 설정되었는지 확인
- anon 키가 올바른지 확인