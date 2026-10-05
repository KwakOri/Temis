# 템플릿 내부 이미지 원본 제거

작업일: 2026-10-05 JST. 복구 기준 커밋: `874232d2`.
작업 브랜치: `codex/r2-template-source-removal`.
작업 위치: `/Users/kwakori/.codex/worktrees/r2-template-source-removal/temis`.

## 변경 범위

시간표·팀 시간표·레거시 썸네일 99개 템플릿의 내부 이미지 927개
(913,633,541바이트, 약 871MiB)를 이 워크트리에서 제거했다.
정적 이미지 import 920곳을 `legacyR2ImageSlot` 메타데이터 선언으로 바꿨다.
999개 슬롯의 테마·키·파일 ID·공유 관계·크기를 보존했다. 에디터의 레이아웃과 선택 조건은 유지한다.

홈 이미지 14개, 대표 썸네일 97개, 앱 아이콘 및 개발용 이미지에는 이 삭제를 적용하지 않는다.
원래 체크아웃의 이미지 파일은 보존했다. 운영 DB/R2 쓰기, 운영 배포 및 원래 체크아웃으로의 병합은 하지 않았다.

## 런타임 및 관리 동작

- `r2-only-owners.json`에 등록된 runtime 소유자는 환경 flag와 관계없이 권한 확인 후 R2 runtime API를 조회한다.
- `imgs.ts`는 주소를 하드코딩하지 않는다. 초기 파일 ID와 크기만 선언하며, 표시할 URL/크기는 활성 revision의 등록 버전에서 가져온다.
- 소유자 미등록, 활성 revision 누락, R2 비활성 상태, 슬롯 누락 및 조회 실패를 오류로 처리한다. 삭제된 파일로 조용히 복귀하지 않는다.
- 관리자 후보 미리보기·교체·이력 복원은 유지한다. 삭제된 원본을 가리키는 local 모드 전환은 API에서 거부하며 관리 화면에서도 비활성화한다.
- 홈페이지의 로컬 렌더와 기존 일반·팀·공개 레거시 썸네일 접근 권한 계약은 유지한다.

## 원본 이력과 이관 도구

`scripts/data/legacy-template-removed-sources.json`에 삭제 전 경로·SHA-256·MIME·크기·해상도·슬롯 연결을 보관한다.
에셋 inventory는 변환된 선언만 의도적인 원본 제거로 인식한다. 정적 import가 참조하는 실제 누락은 계속 오류다.
`templateImageFiles`/`templateBytes`는 등록 원본의 논리적 합계이며,
`removedTemplateImageFiles`/`removedTemplateBytes`로 실제 삭제 분량을 구분한다.
이 워크트리에서는 두 삭제 지표가 각각 927/913633541이다.

원본이 없는 runtime 세트에 `migrate:legacy-assets --apply`를 실행하면 DB/R2 접근 전에 중단한다.
관리자 이미지 교체를 사용하거나 원본을 복구한 체크아웃에서 seed 작업을 수행한다.
대표 썸네일 이관과 읽기 전용 dry-run은 기존대로 사용할 수 있다.

## 검증 결과

- 로컬 DB: 99개 runtime 세트 모두 R2 모드. 원본 927개의 등록 해시·크기·해상도와 활성 슬롯의 파일 ID 일치.
- 실제 R2 HEAD: 927개 객체 모두 200이며 Content-Length가 저장소 원본과 일치.
- 실제 로컬 API: 99개 runtime API와 999개 슬롯의 테마·키·URL·해상도 정상.
- 일반 시간표 2종, 팀 시간표, 레거시 썸네일: 원본을 유지한 3000 서버와 원본을 제거한 3108 서버의 화면 이미지·레이아웃 및 다운로드 PNG 픽셀 SHA-256이 정확히 일치.
- 새 서버는 두 R2 환경 flag를 false로 설정했다. 99개 템플릿의 필수 R2 조회가 flag에 의존하지 않음을 확인했다.
- 새 화면에서는 직접 R2 fetch를 차단했다. PNG 임베딩의 동일 출처 프록시 읽기 19회로 다운로드 완료.
- 두 브라우저 모두 GET/HEAD/OPTIONS 외 요청을 차단했다. DB 변경 없이 검증했다.
- TypeScript, 변경 파일 전체 ESLint, inventory, 원본 제거 회귀, API 권한, 이관 CLI, 공개 대표 이미지, 보류 템플릿 검사가 통과했다.
- 대용량 production build는 프로젝트 규칙에 따라 실행하지 않았다.

기존 폰트 로딩에 따른 AutoResizeText 차이를 새 에셋 문제로 판단하지 않도록,
두 비교 화면 모두 폰트 로딩 완료 후 부모 폭 변경/복원으로 기존 텍스트 측정을 맞췄다.
따라서 PNG 픽셀 일치는 기존 폰트 초기화 문제를 수정했다는 의미가 아니다.

```sh
npm run check:legacy-assets:source-removal
npm run check:legacy-assets:inventory
node --import tsx scripts/check-legacy-template-assets-api.ts
node --import tsx scripts/check-legacy-template-assets-migration.ts
node --import tsx scripts/check-project-assets.tsx
node --import tsx scripts/check-legacy-template-held-cleanup.ts
npx tsc --noEmit

# 3000: 복구 커밋 상태의 원본 유지 서버, 3108: 이 워크트리의 로컬 DB 서버
npm run check:legacy-assets:source-removal:browser -- \
  --allow-local-read-only --env-dir /Users/kwakori/projects/promotion/temis
```

브라우저 결과는 이 워크트리의 `output/playwright/r2-source-removal/result.json`에 있으며,
스크린샷/다운로드 이미지는 결과물로만 보존하고 Git에 포함하지 않는다.

## 배포 전 확인과 복구

이 검증은 로컬 DB와 실제 R2 읽기를 사용했다. 운영 DB의 현재 활성 모드를 확인한 결과는 아니다.
배포 전 대상 DB의 99개 runtime 세트가 R2 모드이고 활성 revision/전체 슬롯이 유효한지 확인해야 한다.
준비되지 않은 세트는 배포 후 명시적인 오류가 되므로, 원본 유지 버전을 사용해 R2 적용을 먼저 완료한다.
환경 flag를 끄는 것만으로 삭제된 파일을 복구할 수는 없다.

복구는 이 삭제 변경 커밋을 되돌리거나 `874232d2`의 앱 버전으로 되돌린다.
일부 PNG만 복원해 import/정책/파일이 다른 상태를 만들지 않는다.
R2 객체/과거 revision은 이번 작업에서 삭제하지 않아 관리자 이력 복원도 그대로 사용할 수 있다.
