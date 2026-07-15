# 07. 관리자·상점·마이페이지 통합

## 목적

공통 `templates` 루트 위에서 legacy와 Studio 템플릿을 동일한 상품·권한 UX에
노출하되, 편집 및 실행 route만 engine에 따라 분기한다.

## 관리자

- 목록에 Legacy/Studio engine badge와 draft/published/archived 상태를 표시한다.
- Studio 행은 Studio editor, legacy 행은 기존 관리 화면으로 연다.
- 일반 상품(`is_public = true`)만 상점 상품 등록 대상으로 유지한다.
- draft/archived 템플릿은 판매 시작과 사용자 실행을 막는다.

## 상점

- 목록 노출은 `shop_templates.is_shop_visible`로만 판단한다.
- `is_public`은 일반 판매 상품 검증에 사용하지만 이용 권한을 부여하지 않는다.
- 구매 완료 후 access가 생성돼야 실행 링크가 활성화된다.

## 마이페이지

- 사용자 템플릿 API가 `template_engine`, `status`, `use_href`를 반환한다.
- legacy 실행: `/time-table/{templateId}`
- Studio 실행: 신규 사용자용 Studio route
- 현재의 `일반`/`개인` 표시는 `is_public` 상품 분류를 그대로 사용한다.
- draft/archived는 일반 사용자 목록에서 제외한다.

## 완료 조건

- 한 사용자의 legacy/Studio 구매 항목이 한 목록에서 보인다.
- engine별 실행 링크가 정확하다.
- 상점 노출, 상품 분류, 이용 권한이 서로 혼동되지 않는다.

