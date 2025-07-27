# 🧪 Tests Directory

이 폴더는 프로젝트의 테스트 스크립트와 설정 파일들을 포함합니다.

## 📁 파일 구조

### 테스트 스크립트
- **`test-api.js`** - API 엔드포인트 테스트
  - 회원가입, 로그인, 보호된 라우트 테스트
  - 실행: `node tests/test-api.js`

- **`test-complete.js`** - 완전한 인증 플로우 테스트
  - 전체 인증 시스템의 종합 테스트
  - 실행: `node tests/test-complete.js`

- **`test-supabase.js`** - Supabase 연결 테스트
  - 데이터베이스 연결 및 기본 쿼리 테스트
  - 실행: `node tests/test-supabase.js`

- **`test-userservice.js`** - UserService 클래스 테스트
  - CRUD 작업 및 비즈니스 로직 테스트
  - 실행: `node tests/test-userservice.js`

### 설정 및 유틸리티
- **`setup-database.js`** - 데이터베이스 초기 설정 스크립트
  - users 테이블 생성 및 초기 데이터 삽입
  - 실행: `node tests/setup-database.js`

### 보고서
- **`TEST_REPORT.md`** - 테스트 결과 보고서
  - 전체 테스트 실행 결과 및 통계

## 🚀 사용 방법

### 전체 테스트 실행
```bash
# 1. 데이터베이스 설정 (최초 1회)
node tests/setup-database.js

# 2. 개별 테스트 실행
node tests/test-supabase.js
node tests/test-userservice.js
node tests/test-api.js
node tests/test-complete.js
```

### 개발 서버 실행 필요
API 테스트는 개발 서버가 실행 중이어야 합니다:
```bash
npm run dev
```

## 📋 전제 조건

1. **환경 변수 설정**: `.env.local` 파일이 올바르게 설정되어 있어야 함
2. **의존성 설치**: `npm install` 실행 완료
3. **Supabase 설정**: 데이터베이스 스키마가 적용되어 있어야 함

## 🔧 주의사항

- 테스트는 실제 데이터베이스에 영향을 줄 수 있습니다
- 운영 환경에서는 테스트를 실행하지 마세요
- 테스트 후에는 임시 데이터를 정리하는 것을 권장합니다