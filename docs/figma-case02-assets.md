# CASE_02 에셋과 검증

CASE_02 이미지 12개는 Figma 디자인을 수동 변환할 때 사용한 로컬 원본이다.
일회성 업로드 스크립트가 이 파일을 R2에 업로드한 뒤 저장 문서의 `assets`를
R2 URL과 메타데이터로 교체했다. 앱의 Figma 가져오기 API는 별도의 경로이며,
`public/template-studio/figma-case02`에 파일을 생성하지 않는다.

2026-10-10 정리 시 원본 12개, 저장된 메타데이터, R2에서 읽은 파일의 SHA-256과
크기를 대조했다. 모든 파일이 일치했으며 로컬 원본 총 크기는 12,094,407바이트였다.
로컬 복사본은 Git에서 제외되는 `output/template-studio/figma-case02/`로 옮겼다.
기존 일회성 업로드 스크립트도 같은 폴더의 상위 경로에 `.ts.disabled`로 보관했다.
이 정리 작업에서 원격 DB나 R2 객체는 변경하지 않았다.

`scripts/templates/figma-case02.ts`는 수동 변환한 편집 가능한 문서 구조를 유지한다.
생성 함수는 호출자가 전달한 R2 에셋 메타데이터를 사용하며 로컬 이미지 경로나
특정 개발 템플릿의 R2 URL을 내장하지 않는다. R2 메타데이터가 없는 에셋은 거부한다.

기존 저장 결과의 `document.assets`를 이용해 검토용 JSON을 생성하려면:

```sh
node --import tsx scripts/import-figma-case02-template.ts output/template-studio/figma-case02-saved.json
```

결과는 무시되는 `output/template-studio/figma-case02.json`에 생성된다.
이 명령은 R2 업로드나 DB 저장을 하지 않는다. R2 URL은 제공한 저장 결과의
템플릿에 속하므로 다른 템플릿으로 복제할 때는 별도의 에셋 등록 절차가 필요하다.

오프라인 회귀 검증은 실제 이미지 대신 합성 R2 메타데이터로 렌더링과 바인딩,
로컬 경로 거부를 확인한다:

```sh
node --import tsx scripts/check-figma-case02-template.tsx
```
