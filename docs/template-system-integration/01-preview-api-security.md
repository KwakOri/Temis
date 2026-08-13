# 01. Template Studio Preview/API 보안 정비

상태: 완료 (2026-07-15)

## 목적

발행 문서 전체를 반환하는 Template Studio preview API를 관리자 전용으로
고정한다. 상품 상세에서 필요한 썸네일·샘플 정보와 실제 실행 문서를 분리한다.

## 현재 문제

`GET /api/template-studio/templates/{id}/preview`는 인증 확인 없이 저장된 draft 또는
published document를 반환할 수 있다. 아직 일반 사용자용 이용 권한 모델이 연결되지
않았으므로 이 API를 공개 상태로 둘 근거가 없다.

## 변경 범위

- 기존 Template Studio 관리자 API와 같은 인증·관리자 판정 helper를 사용한다.
- 미인증 요청은 `401`, 일반 사용자 요청은 `403`으로 처리한다.
- 존재하지 않는 템플릿은 권한 확인 뒤 `404`로 처리한다.
- 응답에는 관리자 preview에 필요한 draft/published document만 포함한다.
- 상품 페이지는 이 API를 호출하지 않고 기존 상품 메타데이터와 썸네일만 사용한다.
- 일반 사용자 실행 API는 8단계에서 별도 route로 만든다.

## 영향 파일

- `src/app/api/template-studio/templates/[id]/preview/route.ts`
- Template Studio API 인증 helper 및 관련 테스트
- preview를 호출하는 service/hook의 오류 처리

## 완료 조건

- 세션 없는 요청으로 문서 JSON을 읽을 수 없다.
- 일반 사용자 세션으로 문서 JSON을 읽을 수 없다.
- 관리자 세션은 기존 preview 동작을 유지한다.
- 다른 Template Studio 관리자 API의 인증 응답 규칙과 일치한다.

## 로컬 검증

- route 단위 테스트 또는 API check에 401/403/200 사례를 추가한다.
- 타입 검사와 Template Studio API check를 실행한다.
- 원격 DB 변경은 수행하지 않는다.

검증 완료:

- 미인증 요청 `401`
- 일반 사용자 요청 `403`
- 관리자 요청 및 발행 문서 조회 성공

