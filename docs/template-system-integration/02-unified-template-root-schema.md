# 02. `templates` 공통 루트 컬럼 추가

상태: 완료 (2026-07-15)

## 목적

기존 `templates`를 레거시와 Studio 템플릿의 공통 루트로 확장한다. 숫자 `version`
대신 역할이 분명한 `template_engine`을 사용해 문서 버전·revision 번호와 혼동하지
않는다.

## 스키마 변경

```sql
ALTER TABLE public.templates
  ADD COLUMN template_engine text NOT NULL DEFAULT 'legacy',
  ADD COLUMN status text NOT NULL DEFAULT 'published',
  ADD COLUMN created_by bigint REFERENCES public.users(id) ON DELETE SET NULL;
```

추가 제약과 인덱스:

- `template_engine IN ('legacy', 'studio')`
- `status IN ('draft', 'published', 'archived')`
- `(template_engine, status, updated_at DESC)` 조회 인덱스
- `is_public`은 상품 분류이며 접근 권한이 아니라는 DB comment

## 기존 데이터 처리

- 원격에서 복제한 기존 `templates` 81건은 모두 `legacy`, `published`로 backfill한다.
- 기존 `id`, 이름, 설명, 공개 상품 분류, 상점 연결은 변경하지 않는다.
- `created_by`는 과거 데이터를 추측해서 채우지 않고 `NULL`을 허용한다.
- Studio 생성 시에는 `studio`, `draft`, 현재 관리자 사용자 id를 기록한다.

## 애플리케이션 계약

- 공통 Template 타입에 세 필드를 추가한다.
- Studio 목록은 항상 `template_engine = 'studio'`를 명시한다.
- 레거시 전용 조회가 Studio 행을 오인하지 않도록 필요한 쿼리에 엔진 필터를 추가한다.
- `status != 'published'`인 템플릿은 판매·일반 사용자 이용 대상이 아니다.

## 완료 조건

- 기존 데이터 손실 없이 migration up/down 검토가 가능하다.
- 잘못된 engine/status 값 삽입이 DB 제약으로 차단된다.
- 기존 레거시 화면과 서비스가 기본값 추가 후에도 동작한다.
- 마이그레이션은 로컬 DB에만 적용한다.

로컬 검증 결과 기존 81건은 모두 `legacy`, `published`로 backfill됐으며 원격
DB에는 이 마이그레이션을 적용하지 않았다.

