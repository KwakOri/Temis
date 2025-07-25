# JWT 인증 시스템 구현 완료

Next.js API Router를 활용한 서버리스 JWT 인증 시스템이 성공적으로 구현되었습니다.

## 🎯 구현된 기능

### 1. **JWT 유틸리티 (`src/lib/auth/`)**
- `jwt.ts`: JWT 토큰 생성, 검증, 디코딩
- `password.ts`: 비밀번호 해싱 및 검증
- `middleware.ts`: 인증 미들웨어 함수들

### 2. **API Routes (`src/app/api/auth/`)**
- `POST /api/auth/login`: 로그인
- `POST /api/auth/logout`: 로그아웃
- `GET /api/auth/verify`: 토큰 검증
- `POST /api/auth/register`: 회원가입
- `GET /api/auth/protected-example`: 보호된 리소스 예시

### 3. **클라이언트 사이드 (`src/contexts/`, `src/components/auth/`)**
- `AuthContext`: 인증 상태 관리
- `LoginForm`: 로그인 폼 컴포넌트
- `RegisterForm`: 회원가입 폼 컴포넌트
- `UserProfile`: 사용자 프로필 컴포넌트

### 4. **테스트 페이지**
- `/auth-test`: 인증 시스템 테스트 페이지

## 🔧 설정

### 환경 변수 (`.env.local`)
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d
```

### 설치된 패키지
```bash
npm install jose bcryptjs @types/bcryptjs
```

## 🚀 사용 방법

### API 사용 예시
```javascript
// 로그인
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});

// 보호된 리소스 접근
const protectedResponse = await fetch('/api/auth/protected-example', {
  credentials: 'include' // 쿠키 포함
});
```

### React 컴포넌트에서 사용
```tsx
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm, UserProfile } from '@/components/auth';

function App() {
  return (
    <AuthProvider>
      <MyComponent />
    </AuthProvider>
  );
}

function MyComponent() {
  const { user, login, logout } = useAuth();
  
  if (user) {
    return <UserProfile />;
  }
  
  return <LoginForm />;
}
```

### 보호된 API Route 만들기
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // 인증 실패
  }

  const { user } = authResult;
  
  return NextResponse.json({
    message: '인증된 사용자만 접근 가능',
    user
  });
}
```

## 🧪 테스트 계정

기본적으로 제공되는 테스트 계정:
- **이메일**: admin@example.com, user@example.com
- **비밀번호**: password123

## 🔒 보안 기능

- JWT 토큰은 HTTP-Only 쿠키로 저장
- 비밀번호는 bcrypt로 해싱 (saltRounds: 12)
- 토큰 만료 시간 설정 (기본 7일)
- 비밀번호 강도 검증
- CSRF 보호를 위한 SameSite 쿠키 설정

## 📁 프로젝트 구조

```
src/
├── lib/auth/
│   ├── jwt.ts           # JWT 유틸리티
│   ├── password.ts      # 비밀번호 유틸리티
│   ├── middleware.ts    # 인증 미들웨어
│   └── index.ts
├── app/api/auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── verify/route.ts
│   ├── register/route.ts
│   └── protected-example/route.ts
├── contexts/
│   └── AuthContext.tsx  # 인증 컨텍스트
├── components/auth/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── UserProfile.tsx
│   └── index.ts
└── app/auth-test/
    └── page.tsx         # 테스트 페이지
```

## 🎉 완료!

JWT 기반 인증 시스템이 완전히 구현되었습니다. `/auth-test` 페이지에서 테스트해보세요!