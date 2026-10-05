# 레거시 템플릿 R2 에셋 이관 및 관리 시스템 구현 계획

작성일: 2026-10-04
상태: 구현 전 계획. `.src` 접근 정리만 완료.
작업 브랜치: `codex/legacy-image-src`

## 1. 목표와 확정 사항

레거시 템플릿은 현재 형태로 계속 운영한다. 이미지 파일을 R2에서 제공하고,
관리자가 템플릿별 이미지를 조회·교체·복원할 수 있게 한다.

- 템플릿 ID, 기존 URL, 테마명, 이미지 키, 파일명은 유지한다.
- 레이아웃, 좌표, CSS, 색상, 입력 설정, 이미지 선택 조건은 유지한다.
- snake_case 이름 변경과 Studio 문서 변환은 범위에 포함하지 않는다.
- UI의 이미지 접근은 `Imgs[theme][key].src`를 유지한다.
- UI에서 URL을 자르거나 치환하지 않고 데이터 공급 단계에서 완성된 URL을 제공한다.
- 관리자 화면은 첫 구현에 포함한다. 교체 이력과 복원도 필수 기능이다.
- Supabase에는 연결 정보와 메타데이터를, R2에는 이미지 바이트를 저장한다.
- 원격 DB 변경과 운영 R2 일괄 이관은 구현·검증 후 별도의 명시된 실행 요청으로 진행한다.

## 2. 조사 기준과 현재 상태

2026-10-03 저장소 조사 기준. 구현 시작 시 inventory를 다시 생성한다.
폴더 개수는 DB에 등록된 운영 템플릿 개수와 같다고 가정하지 않는다.

| 구분          | UUID 템플릿 폴더 | 이미지 파일 | `Imgs` 테마·키 연결 |
| ------------- | ---------------: | ----------: | ------------------: |
| 일반 시간표   |               91 |         867 |                 939 |
| 팀 시간표     |                7 |          57 |                  57 |
| 레거시 썸네일 |                1 |           3 |                   3 |
| 합계          |               99 |         927 |                 999 |

- 이미지 합계는 약 871MiB이다. 동일 바이트 파일은 887종이며 중복 용량은 약 36MiB이다.
- 일반·팀 시간표의 이미지 소비 파일은 410개, 썸네일 포함 시 413개이다.
- `.src.replace("./", "/")` 401곳을 205개 파일에서 제거했다.
- 변경 전후 타입 검사, 변경 후 린트와 diff 검사가 통과했다. 기존 린트 경고는 남아 있다.
- `0c10c964-b83c-4309-a81b-76550aba17b0`에는 없는 파일을 import하는 항목 3개가 있다.
- 템플릿 폴더 내 이미지 7개는 `imgs.ts` import에 연결되지 않았다.
- 별도로 샘플·테스터 `imgs.ts` 3개와 `public/` 이미지 120개가 있다.
- Studio의 원격 이미지 사전 임베딩과 동일 출처 프록시 fallback은 이미 구현돼 있다.
- 레거시 다운로드와 공유 캡처에는 이 처리가 아직 연결되지 않았다.

주요 근거:

- 이미지 계약: `src/types/time-table/image.ts`
- 현재 이미지 연결: 각 템플릿의 `_img/imgs.ts`
- 레거시 다운로드: `src/hooks/useTimeTableState.ts`
- 레거시 공유 캡처: `src/components/TimeTable/TweetPreviewModal.tsx`
- 기존 R2 기능: `src/lib/r2.ts`
- Studio PNG 처리: `src/utils/template-studio/png-export.ts`
- R2 이미지 프록시: `src/app/api/template-studio/assets/image/route.ts`
- Studio 전용 조회: `src/services/server/templateStudioPersistenceService.ts`
- 관리자 내비게이션: `src/components/admin/AdminDashboardShell.tsx`, `src/lib/adminTabs.ts`

## 3. 전체 구조

```text
관리자 UI -> React Query -> admin Service -> 관리자 API
                                            -> Supabase 에셋 연결/이력
                                            -> R2 업로드 검증

템플릿 페이지 -> AssetsProvider -> React Query -> 사용자 Service
                                                -> 권한 확인 API
                                                -> 적용 중 manifest + 완성된 이미지 URL
              -> 기존 레거시 컴포넌트

PNG/공유 캡처 -> 이미지 사전 임베딩 -> R2 직접 읽기
                                   -> 실패 시 기존 이미지 프록시
```

`template_studio_assets`와 Studio API는 그대로 사용하지 않는다. 해당 조회는
`template_engine = 'studio'`로 제한되고, 팀 템플릿과 레거시 썸네일의 부모 테이블도 다르다.
R2 transport와 이미지 캡처 기능만 필요한 범위에서 재사용한다.

## 4. 대상 식별과 데이터 모델

### 4.1 소유 대상

외부 API 식별자는 `(ownerKind, templateId)`로 고정한다.

| ownerKind        | 부모 테이블               | 기존 화면               |
| ---------------- | ------------------------- | ----------------------- |
| `timetable`      | `templates`의 legacy 엔진 | `/time-table/{id}`      |
| `team_timetable` | `team_templates`          | `/team-time-table/{id}` |
| `thumbnail`      | `thumbnails`              | `/thumbnails/{id}`      |

등록 시 실제 부모 행과 라우트 파일을 대조한다. 폴더만 있는 대상은 inventory에서
미연결로 표시하고 운영 등록을 중단한다. 원본 템플릿 행을 자동 생성하지 않는다.

### 4.2 제안 테이블

다음 이름은 신규 제안이다. 실제 migration은 기존 명명 방식과 대조하여 작성한다.

| 테이블                            | 주요 필드                                                                                                                                                    | 역할                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `legacy_template_asset_sets`      | id, owner_kind, template_id/team_template_id/thumbnail_id, expected_slots, active_revision_id, updated_at                                                    | 대상 및 현재 적용 버전              |
| `legacy_template_asset_versions`  | id, asset_set_id, asset_id, storage_path, content_hash, mime_type, byte_size, width, height, original_filename, source_relative_path, created_by, created_at | 검증된 파일의 불변 메타데이터       |
| `legacy_template_asset_revisions` | id, asset_set_id, revision_no, bindings, source, restored_from_revision_id, created_by, created_at                                                           | 적용·교체·복원 이력의 불변 snapshot |

- 부모 ID 컬럼은 각각 실제 테이블에 FK를 연결한다. owner_kind와 맞는 컬럼 하나만
  채워지도록 CHECK하고, 부모별 부분 unique index를 둔다.
- active revision은 같은 asset set의 revision만 지정할 수 있도록 composite FK로 제한한다.
- versions의 `(asset_set_id, asset_id, content_hash)`와 `storage_path`는 unique로 둔다.
- revision의 `(asset_set_id, revision_no)`는 unique로 둔다.
- `expected_slots`는 코드에 선언된 전체 테마·키 계약이다. 관리자 교체에서 변경할 수 없다.
- bindings는 `theme -> 기존 key -> asset_version_id` 형태의 JSONB이다.
- bindings의 참조는 저장 RPC에서 같은 set의 파일인지, 계약과 일치하는지 검증한다.
- 다른 환경의 R2 prefix는 DB 환경별로 분리한다. dev 데이터에 운영 object key를 등록하지 않는다.
- RLS와 서비스 권한은 기존 인증 방식에 맞추고 관리자 변경은 서버를 통해 수행한다.
- 부모 삭제 시 registry를 함께 정리하되 R2 객체를 즉시 지우지는 않는다.

파일 버전은 같은 원본이 여러 슬롯에 연결돼도 한 번 저장한다. 교체는 기본적으로
선택한 슬롯만 바꾼다. 다른 슬롯도 같은 파일을 참조하는 경우 영향 목록을 표시하고,
선택한 슬롯들을 한 revision에서 함께 바꾸는 동작을 제공한다.

### 4.3 적용과 복원

1. 업로드와 검증으로 후보 파일 버전을 만든다. 현재 적용 상태는 유지한다.
2. 관리자 미리보기에서 후보 이미지를 확인한다.
3. `expectedRevisionId`와 슬롯 변경 목록을 보내 적용한다.
4. DB transaction에서 set을 잠그고 현재 revision, 모든 슬롯, 파일 참조를 검증한다.
5. 새 revision 생성과 active pointer 갱신을 한 transaction에서 완료한다.
6. 동시 수정 충돌은 `409`로 반환한다. 최신 이력을 조회한 뒤 다시 적용한다.

복원도 과거 snapshot을 복사한 새 revision으로 기록한다. 과거 파일과 기록은 수정하지 않는다.
업로드 성공 후 DB 저장 실패 시 파일은 미연결 후보로 남고 현재 템플릿은 바뀌지 않는다.
사용자가 업로드 완료만으로 적용된 것으로 오해하지 않게 후보/적용 상태를 구분한다.

## 5. R2 저장과 업로드

```text
legacy-template-assets/{env}/{ownerKind}/{templateId}/assets/{assetId}/{sha256}.{ext}
```

- 기존 파일명과 이미지 키를 R2 경로 식별자로 정규화하지 않는다.
- `assetId`는 템플릿 상대 파일 경로의 SHA-256 등 재실행 가능한 안정 ID로 만든다.
  별개의 경로가 같은 바이트를 가져도 초기 구현에서는 독립된 에셋으로 관리한다.
- 재실행 시 같은 assetId와 콘텐츠 해시의 업로드를 건너뛴다. 전역 중복 제거는 도입하지 않는다.
- 원본 파일명은 메타데이터로 보관한다. 이관 시 이미지 변환·압축·리사이즈를 하지 않는다.
- `storage_path`를 기준 정보로 저장하고 public URL은 서버 설정으로 생성한다.
- 운영·dev prefix를 명시적으로 선택한다. 운영 스크립트는 NODE_ENV만으로 대상을 추측하지 않는다.
- 이미지 파일 교체 시 새 해시 URL을 사용한다. 기존 객체 덮어쓰기는 금지한다.
- 해시 객체는 장기 immutable cache를 사용하고 manifest는 사용자별 private 응답으로 제공한다.

관리자 업로드는 `presign -> 브라우저 PUT -> verify -> preview -> apply` 순서다.
Next API에는 바이트나 Data URL 대신 메타데이터만 보낸다. PUT 호출도 Services 계층에 둔다.
서버가 소유 대상·에셋 ID로 키를 생성하고, 검증 시 실제 객체 크기·MIME·SHA-256·이미지
크기를 확인한다. 파일당 크기와 배치 한도는 inventory 최대 크기와 기존 업로드 제한을
확인한 후 정하고, 초과 파일을 사전에 보여준다. hash 계산/검증은 제한된 동시성으로 실행한다.

브라우저 PUT은 임시 `legacy-template-asset-uploads/{env}/{uploadId}` 경로만 허용한다.
presign 응답의 만료되는 서명 ticket에 대상·에셋·예상 해시·임시 key를 연결하고 verify에서
검사한다. canonical 경로에 PUT URL을 발급하면 검증 전에 기존 파일을 덮어쓸 수 있으므로
발급하지 않는다. 서버는 제한된 크기의 임시 파일 바이트를 읽어 검증한 바로 그 바이트를
canonical key에 저장한다. 이미 같은 key가 있으면 내용 일치를 확인하고 재사용한다.
검증 이후 임시 파일이 바뀌는 상황에서도 검증된 바이트만 승격되도록 처리한다.

`src/lib/r2.ts`의 기존 서버 업로드 함수 두 곳에는 `ACL: "public-read"`가 남아 있다.
presigned 경로는 이미 ACL 없이 구현돼 있다. 이관용 서버 업로드에는 ACL을 사용하지 않고,
기존 helper를 수정할 경우 기존 주문·포트폴리오·Studio 업로드 경로도 검증한다.
CacheControl과 metadata read는 기존 helper에 선택 옵션을 추가하는 범위에서 재사용한다.

Cloudflare 설정 기준:

- 운영 이미지 제공은 custom domain을 사용한다.
- 브라우저 직접 PUT/GET에 필요한 origin, method, header만 CORS에 등록한다.
- PNG용 프록시 fallback은 유지한다. 프록시 URL은 설정된 R2 origin/path만 허용한다.
- 공개 에셋 URL은 파일 자체의 구매 권한 보호 수단이 아니다. 기존 공개 파일 배포 모델을
  유지하며, manifest와 관리자 작업에 기존 사용자 권한을 적용한다.

참고: [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/),
[CORS](https://developers.cloudflare.com/r2/buckets/cors/),
[S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/).

## 6. 레거시 런타임 연결

### 6.1 이미지 타입과 Provider

`StaticImageData`에 묶인 타입을 `src`와 필요한 width/height 등 메타데이터를 가진
레거시 이미지 타입으로 완화한다. 기존 static imports와 R2 응답이 모두 같은 계약을 만족한다.

```ts
type LegacyTemplateImages = Record<string, Record<string, LegacyTemplateImage>>;

// 기존 키 및 선택 로직 보존
const Imgs = useLegacyTemplateImages();
// <img src={Imgs[currentTheme][cardName].src} ... />
```

- 템플릿별 페이지/Editor 위에 Provider를 한 번 배치하고 하위 컴포넌트가 같은 snapshot을 쓴다.
- `_img/imgs.ts` import를 context hook으로 전환한다. 모듈의 전역 객체를 비동기로 수정하지 않는다.
- hook은 React 컴포넌트 안에서만 호출한다. 순수 helper의 이미지 접근은 인자로 전달한다.
- 같은 화면의 이미지 URL들은 단일 revision 응답에서 생성한다. 슬롯별 요청은 하지 않는다.
- Provider가 로딩·권한 오류·이미지 계약 오류와 재시도를 처리한다. 실패한 상태에서 PNG 저장을 막는다.
- `.src`에는 완성된 URL을 전달하며 기존 조건문, 키 배열과 `cardName` 생성은 변경하지 않는다.
- 일반 시간표, 팀 시간표, 썸네일의 렌더링 컴포넌트는 통합하거나 재작성하지 않는다.

### 6.2 조회와 권한

- 일반 시간표는 기존 `TemplateService.resolveEntitlement` 기반 권한을 적용한다.
- 팀 시간표는 기존 팀 연결과 팀 멤버 검사를 재사용한다. Studio entitlement로 대체하지 않는다.
- 레거시 썸네일은 기존 접근 계약을 먼저 확인하고 동일하게 유지한다. 공개 여부를 임의로 바꾸지 않는다.
- 관리자 후보 revision 조회와 미리보기 override는 관리자에게만 허용한다.
- 원격으로 전환한 템플릿에서 401/403, DB 오류, 데이터 누락을 로컬 fallback으로 숨기지 않는다.

점진 전환 중에는 아직 이관하지 않은 템플릿만 명시적인 local 모드를 사용한다.
R2 모드 전환은 검증된 active revision이 준비된 대상부터 진행한다. 최종 전환 후 static
import와 이미지 파일을 제거하므로, 운영에서 local 모드를 되돌리는 것은 이전 배포 복원이
필요하다. 이미지 교체의 복원은 DB revision 복원으로 처리한다.

### 6.3 React Query 캐시

- 런타임 key: `['legacy-assets', 'runtime', ownerKind, templateId, authScope]`
- 관리자 key: 목록 필터, 대상 detail, revision history를 구분한다.
- authScope는 사용자 및 접근 범위를 포함한다. 로그아웃/계정 변경 때 기존 사용자 캐시를 비운다.
- 후보 업로드는 관리자 후보 목록만 갱신한다. apply/restore는 대상 detail·history·목록과
  현재 관리자 미리보기의 런타임 query를 invalidate한다.
- 후보 미리보기는 base revision과 선택한 슬롯/파일 버전의 해시를 포함하는 별도 관리자
  query key를 사용한다. 일반 런타임 query에 후보 snapshot을 덮어쓰지 않는다.
- 다른 사용자에게는 페이지 진입·포커스 복귀 시 재조회로 새 revision을 반영한다.
  이미 열린 화면의 즉시 동기화를 위한 Realtime은 추가하지 않는다.
- 관리자 적용 성공과 사용자 화면 반영 시점이 다른 점은 QA에서 확인한다.

## 7. API와 주요 파일

아래 경로는 제안이다. owner kind와 ID는 모든 대상 API에서 함께 검증한다.

| Method / 경로                                            | 동작                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| GET `/api/admin/legacy-template-assets`                  | 대상 목록, 검색, 종류/이관 상태 필터, pagination              |
| GET `/api/admin/legacy-template-assets/[ownerKind]/[id]` | 현재 슬롯, 메타데이터, 후보 파일                              |
| GET `.../[ownerKind]/[id]/revisions`                     | 적용·교체·복원 이력                                           |
| POST `.../[ownerKind]/[id]/uploads/presign`              | 후보 파일 업로드 URL 발급                                     |
| POST `.../[ownerKind]/[id]/uploads/verify`               | R2 실물 검증 및 후보 등록                                     |
| POST `.../[ownerKind]/[id]/preview`                      | 현재 revision과 후보 슬롯 변경을 병합한 읽기 전용 이미지 객체 |
| POST `.../[ownerKind]/[id]/apply`                        | 슬롯 교체/초기 적용과 새 revision 생성                        |
| POST `.../[ownerKind]/[id]/restore`                      | 지정 revision을 새 revision으로 복원                          |
| GET `/api/legacy-template-assets/[ownerKind]/[id]`       | 권한 검사 후 현재 이미지 객체 반환                            |

일반 응답에 draft/candidate 파일을 포함하지 않는다. 목록의 기준은 실제 legacy 부모
레코드와 registry의 연결이며, 이미지 메타데이터가 없는 대상도 미이관으로 표시한다.
미연결 로컬 폴더는 별도의 inventory 결과에 남긴다.

예정 파일:

- `src/types/legacy-template-assets.ts`
- `src/services/server/legacyTemplateAssetService.ts`
- `src/services/admin/legacyTemplateAssetService.ts`
- `src/services/legacyTemplateAssetService.ts`
- `src/hooks/query/useLegacyTemplateAssets.ts`
- `src/hooks/query/useAdminLegacyTemplateAssets.ts`
- `src/contexts/LegacyTemplateAssetsContext.tsx`
- `src/utils/legacy-template-assets/*`: 계약 검증, R2 경로, inventory 도우미
- `src/lib/queryKeys.ts`: 관련 query key 추가
- `supabase/migrations/*_create_legacy_template_assets.sql`: registry, 권한, 원자적 적용 RPC

## 8. 관리자 화면

위치: `/admin/legacy-template-assets`와 `/admin/legacy-template-assets/[ownerKind]/[id]`.
기존 `AdminDashboardShell`과 `adminTabs`에 메뉴를 추가하고 기존 템플릿 관리 화면에서
해당 에셋 detail로 이동하는 링크를 제공한다. 모든 변경 API에서 관리자 권한을 검사한다.

### 목록

- 템플릿 이름/ID 검색, 일반·팀·썸네일 종류 필터, pagination
- 이관 상태, 현재 revision, 에셋/슬롯 수, 최근 변경 시각
- 미등록·누락·검증 실패 상태와 오류 detail
- 템플릿 화면 열기 및 이미지 관리 이동

### 대상 detail

- 테마별 탭과 이미지 키·파일명 검색
- 원본 비율의 썸네일, 키, 파일명, 크기, 해상도, MIME, 해시, R2 경로
- 이미지 확대·다운로드·교체, 동일 파일을 쓰는 슬롯 목록
- 교체 후보의 이전/이후 이미지 비교, 대상 슬롯 선택, 적용 버튼
- 해상도 차이는 레이아웃에 영향을 줄 수 있으므로 적용 전 차이를 표시한다.
- 이력에서 변경자·시각·변경 슬롯 확인과 이전 revision 복원
- 업로드 진행, 검증 실패, 적용 충돌, 적용 성공, 빈 상태와 재시도

교체 후보의 전체 템플릿 미리보기는 기존 레거시 페이지를 사용한다. 관리자 전용
preview 모드에서 base revision과 선택 슬롯/파일 version ID를 Provider에 전달하고,
관리자 preview API가 이를 검증·병합하여 반환한다. URL에는 한도를 둔 식별자 payload만
전달하고 이미지 바이트나 임의 source URL을 넣지 않는다. 기존 레이아웃에서 후보 snapshot을
표시하며 DB revision은 적용 시점에만 생성한다. 전용 Studio 캔버스를 만들지 않는다.
후보 데이터는 일반 사용자에게 노출하지 않는다.

키 추가·삭제·이름 변경은 첫 관리 화면에서 제공하지 않는다. 새 렌더링 슬롯은 코드 계약
변경이 필요하다. 미사용 파일 정리는 이미지 교체 기능과 구분하여 아래 삭제 정책을 따른다.

## 9. PNG와 공유 캡처

Studio의 exporter를 재사용하여 원격 이미지를 사전 임베딩하고 프록시 fallback을 적용한다.
최소한 이미지 준비 부분을 공통 함수로 추출하고, 기존 Studio export가 같은 함수를 쓰게 한다.
레거시 Blob 캡처·리사이즈·파일명·iOS 다운로드 URL 해제 지연은 유지한다.

현재 collector는 `querySelectorAll`로 하위 노드만 조사하므로 루트 자신의 CSS 배경이
누락될 수 있다. 레거시 `#timetable`에는 루트 backgroundImage가 있으므로 재사용 전
루트와 하위 노드의 이미지/CSS URL을 모두 수집하도록 보완한다. CSS 클래스와 필요 시
pseudo-element 배경도 inventory·브라우저 표본에서 확인한다.

- 폰트와 외부 이미지 바이트 준비를 기다린 후 캡처한다.
- CSS background, `<img>`, blob/data URL, 투명 PNG가 모두 유지돼야 한다.
- 이미지 fetch 실패는 불완전한 PNG 대신 명시적 오류로 처리한다.
- `TweetPreviewModal`의 공유 이미지 생성에도 같은 준비 처리를 연결한다.
- 프록시는 기존 configured R2 경로만 읽게 유지한다. 임의 외부 URL 프록시를 추가하지 않는다.
- 루트 배경·다중 테마·요일별 이미지·팀 구성·큰 캡처의 메모리와 iOS 다운로드를 검증한다.

## 10. 이관 도구와 전체 프로젝트 이미지

제안 스크립트: `scripts/inventory-legacy-template-assets.ts`,
`scripts/migrate-legacy-template-assets-to-r2.ts`.

### Inventory

1. TypeScript AST로 import와 `Imgs` 객체를 읽는다. shorthand, 파일 공유, 다중 테마를 처리한다.
2. 모든 로컬 이미지도 스캔해 manifest 연결 여부, 파일 크기, SHA-256, 해상도를 수집한다.
3. 소비 코드의 정적·동적 키를 조사한다. 동적 키는 배열/조건/조합 경로를 별도로 검증한다.
4. 누락 import 3개는 선언에서 실제 미사용인지 확인 후 제거하거나 원본을 확보한다.
5. 미연결 이미지 7개는 미사용으로 단정하지 않고 CSS·문서·예제까지 조사한다.
6. DB 부모와 대조한 ready/unlinked/blocked 결과를 출력한다. 비밀 환경값은 출력하지 않는다.

### Dry-run과 apply

- 기본은 dry-run이다. `--owner-kind`, `--template-id`, `--environment`로 대상을 제한한다.
- 파일 byte는 서버/CLI에서 R2에 직접 보낸다. 브라우저와 Next request body를 경유하지 않는다.
- 각 파일을 검증한 뒤 metadata를 등록하고, 대상의 모든 슬롯이 준비되면 초기 revision을 만든다.
- `assetId + hash` 기준으로 이어 실행하며 현재 revision을 반복해서 생성하지 않는다.
- 이관 재실행으로 관리자 교체를 덮어쓰지 않는다. 기존 초기 등록과 충돌하면 명시적으로 중단한다.
- 실패 대상은 독립적으로 보고하고, 해당 대상은 R2 모드로 전환하지 않는다.
- object 업로드와 DB transaction은 분산 transaction이 아니므로 미연결 object를 별도로 추적한다.

처음 언급한 '프로젝트 이미지 전체'도 inventory 대상이다. 다만 UUID 템플릿과 동일한
부모 ID에 억지로 묶지 않는다. 전체 이관 완료 보고서에는 다음 항목을 모두 포함한다.

| 범주                           | 처리                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| UUID 레거시 템플릿             | 본 시스템에서 업로드·관리·런타임 연결·로컬 파일 제거                                               |
| 샘플·테스터                    | `sample:<이름>` 등 별도 식별로 R2 원본 보관. 테스트 실행의 로컬 의존은 따로 판정                   |
| public 및 공통 이미지          | `project-assets/{env}/{relativePathHash}/{contentHash}.{ext}`로 원본 보관, 기존 사용처별 원격 전환 |
| favicon/PWA/배포에 필요한 파일 | R2 보관 후 해당 플랫폼 계약상 로컬 사본이 필요한지 확인하고 예외 목록 기록                         |

템플릿 관리 화면은 99개 UUID 대상의 관리부터 제공한다. 공통 이미지는 템플릿별
교체 기능과 분리해 프로젝트 에셋 목록에서 경로·참조·R2 보관 상태를 보여준다.
공통 이미지의 사용처가 코드 상수라면 URL 공급 모듈을 통해 전환하고, 런타임 교체가
가능한 사용처에만 같은 후보/적용 흐름을 연결한다. 템플릿 이관이 끝났다는 이유로
전체 프로젝트 이미지 이관 완료라고 보고하지 않는다.

## 11. 보관, 미사용 판정과 삭제

- '현재 화면에서 미사용'과 '삭제 가능'은 다른 상태다.
- 현재 revision, 과거 복원 가능한 revision, 후보 preview에서 참조하는 파일은 삭제하지 않는다.
- 검증된 metadata가 없는 업로드 object도 inventory와 대조한다.
- 관리자 화면에 참조 수와 보관 사유를 표시한다. 복원 이력의 파일은 삭제 동작을 막는다.
- 초기 운영 이력은 유지하고, 이력 보존 기한에 따른 자동 삭제는 도입하지 않는다.
- 정리 도구는 기본 dry-run, 최소 유예 기간, dev/운영 prefix 분리, 대상 목록 출력 후 apply로 구성한다.
- 정리 실행과 업로드·preview 작업이 겹쳐 참조되지 않은 객체를 지우지 않도록 유예와 작업 상태를 확인한다.
- 객체 삭제 실패는 재시도 대상으로 기록한다. DB 부모 삭제의 성공과 파일 정리 성공을 별도로 보고한다.

## 12. 구현 단계와 완료 기준

| 단계 | 작업                                  | 완료 기준                                                               |
| ---- | ------------------------------------- | ----------------------------------------------------------------------- |
| 0    | `.src` 접근 통일                      | 완료: 401곳 제거, 타입·린트·diff 검사 통과                              |
| 1    | inventory/사용처/DB 매핑 도구         | 927파일·999슬롯 재대조, 공통 이미지 포함, 누락·동적 키·미연결 대상 분류 |
| 2    | DB 스키마·RPC·서버 서비스             | 로컬 migration, FK/계약/권한/충돌/복원 검증                             |
| 3    | R2 업로드·검증 API와 이관 도구        | dev 표본 dry-run/apply, 재실행 중복 없음, 실패해도 현재 적용 상태 보존  |
| 4    | 관리자 목록·detail·교체·미리보기·복원 | 관리자 브라우저에서 전체 흐름과 오류/충돌 상태 검증                     |
| 5    | 런타임 Provider와 PNG/공유 연결       | 단일·다중 테마·팀·썸네일 표본의 화면과 캡처 비교 통과                   |
| 6    | 전체 템플릿 전환                      | 전 대상 계약 검사와 라우트 smoke, 단계별 활성화 후 static imports 제거  |
| 7    | 공통·샘플 에셋과 로컬 정리            | 전체 이미지 R2 보관·참조 전환 보고서, 유지할 로컬 사본 예외 명시        |
| 8    | 운영 적용 준비                        | migration/업로드 대상과 순서, 복원 절차, 최종 QA 결과 작성              |

각 단계는 검토 가능한 작은 변경으로 분리한다. 관리 화면 없이 파일 업로드만 끝낸
상태를 완료로 보지 않는다. 개발 완료 후 원격 migration과 운영 이관을 실행하는 작업은
프로젝트 원격 DB 규칙에 따라 명시적으로 요청된 때 진행한다.

## 13. 검증 계획

production build/build test는 기본 검증에서 제외한다.

- `npx tsc --noEmit --pretty false`
- `npm run lint`와 `git diff --check`
- 신규 `check:legacy-assets:inventory`: 파일/슬롯 매핑, 키 보존, 해시와 누락 판정
- 신규 `check:legacy-assets:persistence`: 부모 종류, JSON 참조, revision 원자성, 충돌과 복원
- 신규 `check:legacy-assets:api`: 관리자/사용자 권한, 후보 격리, 잘못된 키/해시/크기 처리
- 신규 `check:legacy-assets:migration`: dry-run 무변경, 부분 실패 재개, 관리자 교체 보존
- `node --import tsx scripts/check-studio-rasterizer.ts` 및 신규 레거시 이미지 캡처 검증

R2와 DB가 필요한 검사는 local DB + dev R2 prefix에서 수행한다. 원격 Supabase가 필요한
읽기 검사는 temis 토큰과 ref `ajlgjdwkjyayrnocdfpj`를 사용하며 토큰 값을 출력하지 않는다.

브라우저 QA:

1. 기존 로컬 이미지와 R2 이미지에서 같은 날짜·테마·입력·크기로 화면 및 PNG를 비교한다.
2. 일반 시간표는 모든 테마와 요일, 온라인/오프라인 및 다중 항목 상태를 확인한다.
3. 팀 시간표는 모든 구성원별 이미지와 팀 권한을 확인한다.
4. 레거시 썸네일은 기존 접근 권한과 프로필/장식 이미지를 확인한다.
5. 관리자 교체, 동일 파일 공유 슬롯, 적용 충돌, 후보 취소, 이전 버전 복원을 확인한다.
6. 직접 R2 fetch를 실패시켜 프록시 fallback으로 PNG가 완성되는지 확인한다.
7. 이미지 로딩 실패 시 저장을 막고, 루트 CSS 배경과 투명도가 출력에 유지되는지 확인한다.
8. 로그아웃/계정 변경 시 이전 사용자의 manifest cache가 재사용되지 않는지 확인한다.
9. desktop/mobile에서 관리자 표·이미지·버튼의 배치와 파일명 넘침을 확인한다.

전 라우트와 선언된 슬롯은 자동 검사한다. 동적 선택의 모든 실행 경로를 정적 분석만으로
보장하지 않으며, 키 배열/조건을 열거하는 검사와 대표 브라우저 상태 검증을 함께 수행한다.

## 14. 운영 전환과 복구

1. 운영 대상과 environment를 확정하고 전체 inventory/DB mapping을 읽기 검증한다.
2. 명시적으로 요청된 운영 migration을 temis 토큰으로 적용한다.
3. 운영 dry-run 결과를 확인한 뒤 파일 업로드·검증·초기 manifest 등록을 실행한다.
4. 검증된 소수 대상부터 Provider를 R2 모드로 활성화하고 화면/PNG/권한을 확인한다.
5. 일반·팀·썸네일 순서로 확대하며 실패 대상은 활성화하지 않는다.
6. 전체 활성화와 관리자 교체·복원이 확인된 후 로컬 에셋 제거 배포를 진행한다.
7. 공통 이미지 보관·전환 상태까지 대조하고 완료 보고서를 남긴다.

잘못된 이미지 교체는 revision 복원으로 되돌린다. 런타임 연결 자체의 문제는 이전 배포로
복구한다. 이전 배포가 static assets를 포함하는지 확인하고 로컬 삭제 배포 전 복구 기준을
보관한다. dev cleanup이나 Studio cleanup이 신규 prefix를 지우지 않는지도 확인한다.

## 15. 최종 완료 조건

- 기존 ID·테마·이미지 키·선택 조건과 레거시 레이아웃이 유지된다.
- 등록된 레거시 템플릿은 R2 이미지로 표시되고 PNG/공유 캡처가 정상 동작한다.
- 관리자 화면에서 템플릿별 조회·후보 업로드·미리보기·적용·이력·복원이 가능하다.
- 적용과 복원은 원자적으로 처리되고 실패/충돌 시 현재 버전이 보존된다.
- 과거 revision에서 참조하는 파일을 미사용으로 삭제하지 않는다.
- 이관 재실행이 중복 파일/이력을 만들거나 관리자 교체를 덮어쓰지 않는다.
- 사용자·팀·썸네일의 기존 접근 권한을 유지한다.
- 로컬 템플릿 이미지 import 의존이 제거되고, 공통·샘플 이미지 이관 및 예외도 기록된다.
- 환경값과 인증정보가 코드·문서·이관 로그에 남지 않는다.
- 위 검증 결과와 운영 적용/복구 절차가 기록돼 있다.
