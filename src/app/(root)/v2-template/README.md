## v2 Template

`_v2_template`는 템플릿 구조(이미지/폰트/좌표/색상)를 코드 상수 대신 DB의 `template_render_configs.render_config`에서 읽어 렌더링하는 실험용/전환용 템플릿입니다.

### API

- 사용자/공개 조회: `GET /api/v2/template-render-config/:templateId`
- 관리자 조회/저장: `GET|PUT /api/admin/v2/templates/:id/render-config`

### 렌더링 동작

- 페이지에서 `templateId` query param이 있으면 DB 설정 조회
- 조회 실패/미존재 시 `v2_default` 설정 fallback 사용
- 컴포넌트는 `V2TemplateRenderConfigContext`를 통해 설정을 읽습니다.

### 폰트 관리

- `renderConfig.fonts.registry`에 폰트 페이스(`src`, `weight`, `style`)를 저장합니다.
- `renderConfig.fonts.fontFaceDefaults`에 아래 메트릭 값을 공통 기본값으로 저장합니다.
  - `ascentOverride`
  - `descentOverride`
  - `lineGapOverride`
  - `sizeAdjust`
- 개별 face에서 `metrics`를 지정하면 공통 기본값을 override 할 수 있습니다.
- `baseFonts`와 `componentFonts`는 토큰 기반으로 연결됩니다.
  - 예: `componentFonts.MAIN_TITLE = "primary"` → `baseFonts.primary = "escoredream"` → `fonts.registry.escoredream.family`
- 실제 `@font-face` 주입은 `V2TemplateFontFaceStyle`에서 동적으로 처리합니다.

### 빠른 확인

- 미리보기 기본: `/time-table/_v2_template`
- 특정 템플릿 설정 확인: `/time-table/_v2_template?templateId=<uuid>`
