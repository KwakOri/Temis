# 05. 이용 권한 의미 통합

## 목적

`is_public`을 상품 분류로만 사용하고, 실제 템플릿 이용 여부는 기존 권한 데이터로
일관되게 판정한다.

## 권한 공식

```text
canUse(template, user) =
  user is admin
  OR template_access(template_id, user_id) exists
  OR template_artists -> artists.user_id matches user
```

추가 공통 조건:

- `templates.status = 'published'`
- 요청한 engine의 실행 route와 템플릿 engine이 일치

## 변경 범위

- `TemplateService.hasAccess()`의 `is_public` 즉시 허용 분기를 제거한다.
- `public.has_template_access()` 함수에서도 같은 분기를 제거한다.
- route guard, API, my-page 목록이 동일한 서버 권한 서비스를 사용하도록 정리한다.
- `templates_select_policy` 같은 과거 RLS 정의는 권한의 근거로 사용하지 않는다.
- 무료 템플릿 요구가 생기면 `is_public`을 재사용하지 않고 별도 access mode를
  설계한다.

## 필수 테스트

- 일반 판매 템플릿 + 미구매 사용자: 거부
- 일반 판매 템플릿 + 승인된 사용자: 허용
- 개인 맞춤 템플릿 + 지정 사용자: 허용
- 개인 맞춤 템플릿 + 타 사용자: 거부
- 연결 작가와 관리자: 허용
- draft/archived 템플릿: 일반 사용자 거부

