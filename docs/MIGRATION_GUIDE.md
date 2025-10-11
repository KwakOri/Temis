# Template Purchase Requests 마이그레이션 가이드

## 개요
`purchase_requests` 테이블의 데이터를 `template_purchase_requests` 테이블로 마이그레이션하고, `plan` 컬럼을 `plan_id`로 변경합니다.

## 마이그레이션 단계

### 1단계: 데이터베이스 스키마 변경

#### 1-1. Supabase Studio에서 SQL 실행
```sql
-- supabase/migrations/20250112000000_change_plan_to_plan_id.sql 파일 내용 실행
ALTER TABLE template_purchase_requests
ADD COLUMN plan_id UUID REFERENCES template_plans(id) ON DELETE RESTRICT;
```

#### 1-2. 로컬 Supabase 타입 업데이트
```bash
# Supabase CLI로 타입 생성
npx supabase gen types typescript --local > src/types/supabase.ts
```

### 2단계: 데이터 마이그레이션 스크립트 실행

#### 2-1. 마이그레이션 스크립트 실행
```bash
node scripts/migrate-purchase-requests.js
```

이 스크립트는 다음 작업을 수행합니다:
- `purchase_requests` 테이블의 모든 데이터 조회
- 각 레코드의 email로 `users` 테이블에서 user_id 찾기
- `plan_id`를 `54bc7f78-8671-4275-b849-f5ae013646d8`로 설정
- `template_purchase_requests` 테이블에 데이터 삽입

#### 2-2. 마이그레이션 검증
```sql
-- 마이그레이션된 데이터 확인
SELECT
  tpr.*,
  u.email,
  tp.plan as plan_name
FROM template_purchase_requests tpr
LEFT JOIN users u ON tpr.user_id = u.id
LEFT JOIN template_plans tp ON tpr.plan_id = tp.id
ORDER BY tpr.created_at DESC;

-- 레코드 수 비교
SELECT COUNT(*) as old_count FROM purchase_requests;
SELECT COUNT(*) as new_count FROM template_purchase_requests;
```

### 3단계: plan 컬럼 제거 (선택적)

**주의**: 이 단계는 마이그레이션이 완전히 검증된 후에만 실행하세요.

```sql
-- 기존 plan 컬럼 제거
ALTER TABLE template_purchase_requests DROP COLUMN plan;

-- plan_id에 NOT NULL 제약조건 추가
ALTER TABLE template_purchase_requests ALTER COLUMN plan_id SET NOT NULL;
```

### 4단계: 로컬 타입 최종 업데이트
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

## 롤백 방법

마이그레이션에 문제가 있을 경우:

```sql
-- 1. template_purchase_requests의 데이터 삭제
DELETE FROM template_purchase_requests
WHERE created_at >= '2025-01-12';  -- 마이그레이션 시작 날짜로 조정

-- 2. plan_id 컬럼 제거 (아직 plan 컬럼을 제거하지 않은 경우)
ALTER TABLE template_purchase_requests DROP COLUMN plan_id;
```

## 주의사항

1. **프로덕션 환경**에서는 반드시 백업 후 실행
2. 마이그레이션 중 애플리케이션 일시 중단 권장
3. 각 단계마다 데이터 검증 필수
4. plan 컬럼 제거는 모든 코드 변경이 완료된 후 실행

## 체크리스트

- [ ] 데이터베이스 백업 완료
- [ ] SQL 마이그레이션 실행 (plan_id 컬럼 추가)
- [ ] 로컬 타입 업데이트
- [ ] 애플리케이션 코드 수정 완료
- [ ] 마이그레이션 스크립트 실행
- [ ] 데이터 검증 완료
- [ ] 애플리케이션 테스트 완료
- [ ] (선택) plan 컬럼 제거
- [ ] (선택) plan_id NOT NULL 제약조건 추가
