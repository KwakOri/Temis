# 대표 썸네일 R2 전용 전환

원본 복구 기준: `79b1e341`. 대상은 `public-project-covers.json`의 대표 썸네일 97개다.

- 목록·카드·구매 이력·팀 목록·도안 가이드의 등록 대표 이미지는 환경 변수와 관계없이 공개 manifest의 활성 R2 버전을 사용한다.
- 조회 중에는 로딩을 표시한다. 미등록, local 모드, 활성 버전 누락, 조회 실패 또는 이미지 로딩 실패 시 오류를 표시한다. 로컬 이미지 URL로 돌아가지 않는다.
- 관리자 썸네일 확인 API도 등록 대표 이미지는 R2만 조회한다. 관리자 화면/API에서 local 모드 전환을 막고 교체·적용·이력 복원은 유지한다.
- 원본 97개, 206,574,623바이트를 제거했다. 경로·파일 ID·해시·크기·해상도·슬롯 연결은 `scripts/data/legacy-cover-removed-sources.json`에 보존했다.
- 대표 이미지 inventory와 이관 dry-run은 보존한 메타데이터를 사용한다. 원본 없는 `--project-assets --all --apply`는 DB/R2 접근 전에 중단한다.
- 홈 이미지와 아이콘, 감사 목록 밖의 이미지 및 Studio의 직접 이미지 URL은 기존 처리를 유지한다.

`NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED`는 이번 대표 이미지 조회에 더 이상 사용하지 않는다. R2 연결 환경 변수는 계속 필요하다.

운영 DB/R2 변경과 배포는 실행하지 않았다. 배포 전에 운영 DB에서 대표 이미지 97개 모두 R2 모드이며 활성 버전과 파일이 유효한지 확인해야 한다. 런타임 내부 이미지 99개도 동일하게 확인한다.

문제가 생기면 이번 변경 전체를 되돌려 대표 이미지 원본과 조회 정책을 함께 복구한다. 환경 변수를 끄는 것으로 원본을 복구할 수 없다.

## 검증

- `npm run check:project-assets`: 원본 97개를 복구 기준의 해시/크기와 대조하고, 환경 변수 true/false, 로딩, 누락, 잘못된 URL, 관리자 확인 API와 local 전환 거부를 검증한다. DB/API는 격리 fixture를 사용한다.
- `node --import tsx scripts/check-legacy-template-assets-migration.ts`: 대표 이미지 dry-run 97개와 원본 없는 apply의 사전 중단을 검증한다.
- 기존 내부 이미지 원본 제거 및 inventory 회귀 검사를 통과했다.
- 실제 Chrome에서 두 대표 이미지 컴포넌트 각각 97개를 검사했다. 환경 변수 false 상태에서 정상, 등록 누락, API 실패, 이미지 실패 모두 manifest 요청 1회, 로컬 이미지 요청 0회였다. API와 이미지 응답은 fixture를 사용했으며 운영 DB/R2에는 접근하지 않았다.
- 브라우저 증거는 `output/playwright/cover-r2-only/result.json`과 desktop/mobile 스크린샷에 남긴다.
