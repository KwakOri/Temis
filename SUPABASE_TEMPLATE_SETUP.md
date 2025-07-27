# Supabase 템플릿 시스템 설정 가이드

## 📋 개요

이 가이드는 `templates`와 `template_access` 테이블을 포함한 전체 데이터베이스 스키마를 Supabase에 설정하는 방법을 설명합니다.

## 🗄️ 테이블 구조

### 1. templates
- 템플릿 정보를 저장하는 메인 테이블
- 개인/공개 템플릿 구분 가능
- JSONB 형태의 content 저장

### 2. template_access
- **조인 테이블**: 사용자와 템플릿 간의 접근 권한 관리
- 특정 사용자가 특정 템플릿에 접근할 수 있는지 제어
- 권한 레벨: read, write, admin

## 🚀 설정 방법

### 방법 1: Supabase Dashboard 사용 (추천)

1. **Supabase 대시보드 접속**
   ```
   https://supabase.com/dashboard
   ```

2. **프로젝트 선택**
   - 현재 프로젝트: `ajlgjdwkjyayrnocdfpj.supabase.co`

3. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New Query" 버튼 클릭

4. **SQL 스크립트 실행**
   ```sql
   -- supabase-tables.sql 파일의 내용을 복사해서 붙여넣기
   -- 또는 supabase-schema.sql 파일의 전체 스키마 실행
   ```

5. **실행 확인**
   - "RUN" 버튼 클릭
   - 성공 메시지 확인

### 방법 2: Supabase CLI 사용

```bash
# CLI 설치 (미설치 시)
npm install -g supabase

# 프로젝트와 연결
supabase link --project-ref ajlgjdwkjyayrnocdfpj

# 스키마 적용
supabase db push
```

## 📊 생성되는 구조

### Templates 테이블
```sql
templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content JSONB,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

### Template Access 테이블 (조인 테이블)
```sql
template_access (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES templates(id),
  user_id UUID REFERENCES auth.users(id),
  access_level VARCHAR(50) CHECK (IN 'read', 'write', 'admin'),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(template_id, user_id)
)
```

## 🔐 보안 설정

### Row Level Security (RLS)
- **Templates**: 소유자는 모든 권한, 공개 템플릿은 모든 사용자 읽기 가능
- **Template Access**: 권한을 가진 사용자와 템플릿 소유자만 조회 가능

### 접근 권한 레벨
- **read**: 템플릿 읽기만 가능
- **write**: 템플릿 읽기/수정 가능
- **admin**: 모든 권한 + 다른 사용자에게 권한 부여 가능

## 🛠️ 사용 예시

### TypeScript에서 사용

```typescript
import { TemplateService, TemplateAccessService } from '@/lib/templates';

// 템플릿 생성
const template = await TemplateService.create({
  name: '내 템플릿',
  description: '설명',
  content: { type: 'timetable', data: [...] },
  is_public: false
});

// 다른 사용자에게 접근 권한 부여
await TemplateAccessService.grantAccess({
  template_id: template.id,
  user_id: 'user-uuid',
  access_level: 'read'
});

// 접근 권한 확인
const hasAccess = await TemplateService.hasAccess(template.id, 'user-uuid');

// 사용자의 템플릿 목록 조회 (소유 + 접근 권한)
const userTemplates = await TemplateService.findUserTemplates('user-uuid');
```

## 🧪 테스트 방법

### 1. 데이터베이스 확인
```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('templates', 'template_access');

-- 함수 확인
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'has_template_access';
```

### 2. 샘플 데이터 생성
```sql
-- 테스트 템플릿 생성
INSERT INTO public.templates (name, description, is_public) VALUES 
('기본 템플릿', '모든 사용자가 사용할 수 있는 기본 템플릿', true);
```

### 3. API 테스트
프로젝트의 TypeScript 코드를 통해 CRUD 작업 테스트

## 📝 주의사항

1. **환경변수 확인**: `.env.local`에 올바른 Supabase URL과 키가 설정되어 있는지 확인
2. **인증 시스템**: `auth.users` 테이블과의 관계 설정 확인
3. **권한 관리**: RLS 정책이 적절히 설정되었는지 확인
4. **데이터 백업**: 운영 환경에서는 데이터 백업 후 진행

## 🔧 트러블슈팅

### 권한 오류
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename IN ('templates', 'template_access');
```

### 외래키 오류
```sql
-- auth.users 테이블 존재 확인
SELECT * FROM auth.users LIMIT 1;
```

### 함수 실행 오류
```sql
-- 함수 테스트
SELECT public.has_template_access('template-uuid', 'user-uuid');
```

## 📚 관련 파일

- `supabase-tables.sql`: 템플릿 테이블만 생성하는 스크립트
- `supabase-schema.sql`: 전체 데이터베이스 스키마
- `src/types/database.ts`: TypeScript 타입 정의
- `src/lib/templates.ts`: 템플릿 관리 서비스 클래스

## ✅ 완료 확인

설정이 완료되면 다음을 확인하세요:

- [ ] templates 테이블 생성됨
- [ ] template_access 테이블 생성됨
- [ ] RLS 정책 적용됨
- [ ] 인덱스 생성됨
- [ ] has_template_access 함수 작동함
- [ ] TypeScript 타입 정의 적용됨
- [ ] 서비스 클래스 사용 가능함