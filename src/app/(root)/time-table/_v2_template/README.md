## v2 Template

`_v2_template`는 템플릿 구조(이미지/폰트/좌표/색상)를 코드 상수 대신 DB의 `template_render_configs.render_config`에서 읽어 렌더링하는 실험용/전환용 템플릿입니다.

### API

- 사용자/공개 조회: `GET /api/v2/template-render-config/:templateId`
- 관리자 조회/저장: `GET|PUT /api/admin/v2/templates/:id/render-config`

### 렌더링 동작

- 페이지에서 `templateId` query param이 있으면 DB 설정 조회
- 조회 실패/미존재 시 `v2_default` 설정 fallback 사용
- 컴포넌트는 `V2TemplateRenderConfigContext`를 통해 설정을 읽습니다.

### 빠른 확인

- 미리보기 기본: `/time-table/_v2_template`
- 특정 템플릿 설정 확인: `/time-table/_v2_template?templateId=<uuid>`
