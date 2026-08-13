# 03. Studio 부모 테이블 제거와 FK 통합

상태: 완료 (2026-07-15)

## 목적

`template_studio_templates`의 중복 루트 정보를 제거하고 모든 Studio 하위 데이터를
`templates.id`에 직접 연결한다.

## 전제

- 현재 Studio 관련 데이터는 테스트 데이터이며 초기화해도 된다.
- 원격에는 Studio 마이그레이션 3개가 아직 적용되지 않았다.
- 이미 만들어진 migration 파일은 수정하지 않고 새 migration에서 최종 구조로
  전환한다. 다른 개발자의 로컬 이력과 재현성을 보호하기 위한 선택이다.

## 변경 순서

1. `template_studio_documents`, revisions, drafts, assets를 비운다.
2. 네 테이블의 `template_id` FK를 제거한다.
3. FK를 `public.templates(id) ON DELETE CASCADE`로 다시 만든다.
4. `template_studio_templates`를 제거한다.
5. publish 함수가 `templates`에서 `template_engine = 'studio'`와 상태를 확인하도록
   수정한다.
6. publish 성공 시 공통 루트의 상태를 `published`로 변경한다.
7. Studio child 조회에 필요한 인덱스와 cascade 동작을 검증한다.
8. 단계 종료 시 Studio가 깨지지 않도록 persistence의 create/get/list/delete 루트
   쿼리를 `templates`로 전환하고 항상 Studio engine을 제한한다.

## 데이터 초기화 범위

- 초기화: Studio documents, revisions, drafts, assets와 Studio 부모 행
- 유지: 기존 `templates`, 판매, 구매 요청, 접근 권한, 작가 연결, legacy/v2 데이터
- R2 테스트 객체는 DB FK 변경과 별도로 prefix 단위 정리한다. 원격 R2 삭제는 이
  단계에서 수행하지 않는다.

## 완료 조건

- `template_studio_templates`가 존재하지 않는다.
- 네 Studio child 테이블의 FK 대상이 모두 `templates`이다.
- legacy 템플릿 id로 Studio 문서를 만들 수 없도록 publish/persistence 계층에서
  엔진을 검증한다.
- Template Studio의 기본 생성·조회·발행·삭제 smoke check가 계속 통과한다.
- Studio 템플릿 삭제 시 child 데이터가 cascade 삭제된다.
- 새 로컬 DB에서 전체 migration reset이 성공한다.

로컬 검증 결과 부모 테이블 제거, 네 FK의 `templates` 연결, publish 시 상태 전환,
삭제 cascade, 전체 migration reset, persistence/API smoke check가 모두 성공했다.
원격 DB에는 이 마이그레이션을 적용하지 않았다.
